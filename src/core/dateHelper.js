/**
 * The DateHelper module
 * a DateHelper class
 * @module dateHelper
 * @copyright CHECKROOM NV 2015
 */
define(["jquery", "moment"], /** @lends DateHelper */ function ($, moment) {

    // Add a new function to moment
    moment.fn.toJSONDate = function() {
        // toISOString gives the time in Zulu timezone
        // we want the local timezone but in ISO formatting
        return this.format("YYYY-MM-DD[T]HH:mm:ss.000[Z]");
    };

    // https://github.com/moment/moment/pull/1595
    //m.roundTo('minute', 15); // Round the moment to the nearest 15 minutes.
    //m.roundTo('minute', 15, 'up'); // Round the moment up to the nearest 15 minutes.
    //m.roundTo('minute', 15, 'down'); // Round the moment down to the nearest 15 minutes.
    moment.fn.roundTo = function(units, offset, midpoint) {
        units = moment.normalizeUnits(units);
        offset = offset || 1;
        var roundUnit = function(unit) {
            switch (midpoint) {
                case 'up':
                    unit = Math.ceil(unit / offset);
                    break;
                case 'down':
                    unit = Math.floor(unit / offset);
                    break;
                default:
                    unit = Math.round(unit / offset);
                    break;
            }
            return unit * offset;
        };
        switch (units) {
            case 'year':
                this.year(roundUnit(this.year()));
                break;
            case 'month':
                this.month(roundUnit(this.month()));
                break;
            case 'week':
                this.weekday(roundUnit(this.weekday()));
                break;
            case 'isoWeek':
                this.isoWeekday(roundUnit(this.isoWeekday()));
                break;
            case 'day':
                this.day(roundUnit(this.day()));
                break;
            case 'hour':
                this.hour(roundUnit(this.hour()));
                break;
            case 'minute':
                this.minute(roundUnit(this.minute()));
                break;
            case 'second':
                this.second(roundUnit(this.second()));
                break;
            default:
                this.millisecond(roundUnit(this.millisecond()));
                break;
        }
        return this;
    };


    /*
     useHours = BooleanField(default=True)
     avgCheckoutHours = IntField(default=4)
     roundMinutes = IntField(default=15)
     roundType = StringField(default="nearest", choices=ROUND_TYPE)  # nearest, longer, shorter
     */

    var INCREMENT = 15;

    /**
     * @name  DateHelper
     * @class
     * @constructor
     */
    var DateHelper = function(spec) {
        spec = spec || {};
        this.roundType = spec.roundType || "nearest";
        this.roundMinutes = spec.roundMinutes || INCREMENT;
        this.timeFormat24 = (spec.timeFormat24) ? spec.timeFormat24 : false;
        this._momentFormat = (this.timeFormat24) ? "MMM D [at] H:mm" : "MMM D [at] h:mm a";
    };

    /**
     * @name  DateHelper#getNow
     * @method
     * @return {moment}
     */
    DateHelper.prototype.getNow = function() {
        // TODO: Use the right MomentJS constructor
        //       This one will be deprecated in the next version
        return moment();
    };

    /**
     * @name DateHelper#getFriendlyDuration
     * @method
     * @param  duration
     * @return {}
     */
    DateHelper.prototype.getFriendlyDuration = function(duration) {
        return duration.humanize();
    };

    /**
     * @name DateHelper#getFriendlyDateParts
     * @param date
     * @param now (optional)
     * @param format (optional)
     * @returns [date string,time string]
     */
    DateHelper.prototype.getFriendlyDateParts = function(date, now, format) {
        /*
         moment().calendar() shows friendlier dates
         - when the date is <=7d away:
         - Today at 4:15 PM
         - Yesterday at 4:15 PM
         - Last Monday at 4:15 PM
         - Wednesday at 4:15 PM
         - when the date is >7d away:
         - 07/25/2015
         */
        if (!moment.isMoment(date)) {
            date = moment(date);
        }
        now = now || this.getNow();
        format = format || this._momentFormat;
        var diff = now.diff(date, 'days');
        var str = (Math.abs(diff) < 7) ? date.calendar() : date.format(format);
        return str
            .replace("AM", "am")
            .replace("PM", "pm")
            .split(" at ");
    };

    /**
     * Returns a number of friendly date ranges with a name
     * Each date range is a standard transaction duration
     * @name getDateRanges
     * @method
     * @param avgHours
     * @param numRanges
     * @param now
     * @param i18n
     * @returns {Array} [{counter: 1, from: m(), to: m(), hours: 24, option: 'days', title: '1 Day'}, {...}]
     */
    DateHelper.prototype.getDateRanges = function(avgHours, numRanges, now, i18n) {
        if( (now) &&
            (!moment.isMoment(now))) {
            now = moment(now);
        }

        i18n = i18n || {
            year: "Year",
            years: "Years",
            month: "Month",
            months: "Months",
            week: "Week",
            weeks: "Weeks",
            day: "Day",
            days: "Days",
            hour: "Hour",
            hours: "Hours"
        };
        var timeOptions = ["years", "months", "weeks", "days", "hours"],
            timeHourVals = [365*24, 30*24,    7*24,    24,     1],
            opt = null,
            val = null,
            title = null,
            counter = 0,
            chosenIndex = -1,
            ranges = [];

        // Find the range kind that best fits the avgHours (search from long to short)
        for (var i=0;i<timeOptions.length;i++) {
            val = timeHourVals[i];
            opt = timeOptions[i];
            if (avgHours>=val) {
                if( (avgHours % val) == 0) {
                    chosenIndex = i;
                    break;
                }
            }
        }

        now = now || this.getNow();
        if (chosenIndex>=0) {
            while (ranges.length < numRanges) {
                counter = (avgHours / val);
                counter += (ranges.length * counter);
                title = i18n[(counter==1) ? opt.replace("s", "") : opt];
                ranges.push({
                    option: opt,
                    hours: avgHours * counter,
                    counter: counter,
                    title: counter + " " + title,
                    from: now.clone(),
                    to: now.clone().add(ranges.length * avgHours, "hours")
                })
            }
        }

        return ranges;
    };

    /**
     * getFriendlyFromTo
     * returns {fromDate:"", fromTime: "", fromText: "", toDate: "", toTime: "", toText: "", text: ""}
     * @param from
     * @param to
     * @param useHours
     * @param now
     * @param separator
     * @param format
     * @returns {}
     */
    DateHelper.prototype.getFriendlyFromTo = function(from, to, useHours, now, separator, format) {
        now = now || this.getNow();

        var sep = separator || " - ",
            fromParts = this.getFriendlyDateParts(from, now, format),
            toParts = this.getFriendlyDateParts(to, now, format),
            result = {
                dayDiff: from.diff(to, 'days'),
                fromDate: fromParts[0],
                fromTime: (useHours) ? fromParts[1] : "",
                toDate: toParts[0],
                toTime: (useHours) ? toParts[1] : ""
            };

        result.fromText = result.fromDate;
        result.toText = result.toDate;
        if (useHours) {
            if(result.fromTime){
                result.fromText += ' ' + result.fromTime;
            }
            if(result.toTime){
                result.toText += ' ' + result.toTime;
            }
        }


        // Build a text based on the dates and times we have
        if (result.dayDiff==0) {
            if (useHours) {
                result.text = result.fromText + sep + result.toTime;
            } else {
                result.text = result.fromText;
            }
        } else {
            result.text = result.fromText + sep + result.toText;
        }

        return result;
    };

    /**
     * @deprecated use getFriendlyFromToInfo
     * [getFriendlyFromToOld]
     * @param  fromDate
     * @param  toDate
     * @param  groupProfile
     * @return {}
     */
    DateHelper.prototype.getFriendlyFromToOld = function(fromDate, toDate, groupProfile) {
        var mFrom = this.roundFromTime(fromDate, groupProfile);
        var mTo = this.roundToTime(toDate, groupProfile);
        return {
            from: mFrom,
            to: mTo,
            daysBetween: mTo.clone().startOf('day').diff(mFrom.clone().startOf('day'), 'days'),
            duration: moment.duration(mFrom - mTo).humanize(),
            fromText: mFrom.calendar().replace(' at ', ' '),
            toText: mTo.calendar().replace(' at ', ' ')
        };
    };

    /**
     * [getFriendlyDateText]
     * @param  date
     * @param  useHours
     * @param  now
     * @param  format
     * @return {string}
     */
    DateHelper.prototype.getFriendlyDateText = function(date, useHours, now, format) {
        if (date==null) {
            return "Not set";
        }
        var parts = this.getFriendlyDateParts(date, now, format);
        return (useHours) ? parts.join(" ") : parts[0];
    };

    /**
     * [addAverageDuration]
     * @param m
     * @returns {moment}
     */
    DateHelper.prototype.addAverageDuration = function(m) {
        // TODO: Read the average order duration from the group.profile
        // add it to the date that was passed
        return m.clone().add(1, 'day');
    };

    /**
     * roundTimeFrom uses the time rounding rules to round a begin datetime
     * @name  DateHelper#roundTimeFrom
     * @method
     * @param m
     */
    DateHelper.prototype.roundTimeFrom = function(m) {
        return (this.roundMinutes<=1) ? m : this.roundTime(m, this.roundMinutes, this._typeToDirection(this.roundType, "from"));
    };

    /**
     * roundTimeTo uses the time rounding rules to round an end datetime
     * @name  DateHelper#roundTimeTo
     * @method
     * @param m
     */
    DateHelper.prototype.roundTimeTo = function(m) {
        return (this.roundMinutes<=1) ? m : this.roundTime(m, this.roundMinutes, this._typeToDirection(this.roundType, "to"));
    };

    /**
     * @name  DateHelper#roundTime
     * @method
     * @param  m
     * @param  inc
     * @param  direction
     */
    DateHelper.prototype.roundTime = function(m, inc, direction) {
        var mom = (moment.isMoment(m)) ? m : moment(m);
        mom.seconds(0).milliseconds(0);
        return mom.roundTo("minute", inc || INCREMENT, direction);
    };

    /**
     * @name  DateHelper#roundTimeUp
     * @method
     * @param  m
     * @param  inc
     */
    DateHelper.prototype.roundTimeUp = function(m, inc) {
        var mom = (moment.isMoment(m)) ? m : moment(m);
        mom.seconds(0).milliseconds(0);
        return mom.roundTo("minute", inc || INCREMENT, "up");
    };

    /**
     * @name DateHelper#roundTimeDown
     * @method
     * @param  m
     * @param  inc
     */
    DateHelper.prototype.roundTimeDown = function(m, inc) {
        var mom = (moment.isMoment(m)) ? m : moment(m);
        mom.seconds(0).milliseconds(0);
        return mom.roundTo("minute", inc || INCREMENT, "down");
    };

    DateHelper.prototype._typeToDirection = function(type, fromto) {
        switch(type) {
            case "longer":
                switch(fromto) {
                    case "from": return "down";
                    case "to": return "up";
                    default: break;
                }
                break;
            case "shorter":
                switch(fromto) {
                    case "from": return "up";
                    case "to": return "down";
                    default: break;
                }
                break;
            default:
                break;
        }
    };

    return DateHelper;

});