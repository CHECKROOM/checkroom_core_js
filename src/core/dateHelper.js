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


    /*
     useHours = BooleanField(default=True)
     avgCheckoutHours = IntField(default=4)
     roundMinutes = IntField(default=15)
     roundType = StringField(default="nearest", choices=ROUND_TYPE)  # nearest, longer, shorter
     */

    var INCREMENT = 15,
        START_OF_DAY_HRS = 9,
        END_OF_DAY_HRS = 17;

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
        this.startOfDayHours = (spec.startOfDayHours!=null) ? startOfDayHours : START_OF_DAY_HRS;
        this.endOfDayHours = (spec.endOfDayHours!=null) ? endOfDayHours : END_OF_DAY_HRS;
        this.businessHours = spec.businessHours || [];
        this.weekStart = spec.weekStart || 1;
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
                    
        return date.calendar() 
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
            year: "year",
            years: "years",
            month: "month",
            months: "months",
            week: "week",
            weeks: "weeks",
            day: "day",
            days: "days",
            hour: "hour",
            hours: "hours"
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
            for(var i=1;i<=numRanges;i++){
                counter = i * avgHours;

                title = i18n[(counter==1) ? opt.replace("s", "") : opt];
                ranges.push({
                    option: opt,
                    hours: counter,
                    title: (counter / timeHourVals[chosenIndex]) + " " + title,
                    from: now.clone(),
                    to: now.clone().add(counter, "hours")
                })
            }
        }

        return ranges.filter(function(r){
            return global.dateHelper.isValidBusinessDate(r.to);
        });
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
        if (!moment.isMoment(from)) {
            from = moment(from);
        }
        if (!moment.isMoment(to)) {
            to = moment(to);
        }
        now = now || this.getNow();

        var sep = separator || " - ",
            fromParts = this.getFriendlyDateParts(from, now, format),
            toParts = this.getFriendlyDateParts(to, now, format),
            result = {
                dayDiff: from ? from.clone().startOf('day').diff(to, 'days') : -1,
                fromDate: from ? fromParts[0] : "No from date set",
                fromTime: (useHours && from != null) ? fromParts[1] : "",
                toDate: to ? toParts[0] : "No to date set",
                toTime: (useHours && to != null) ? toParts[1] : ""
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
                result.text = result.fromText + sep + result.toText;
            } else {
                result.text = result.fromText;
            }
        } else {
            result.text = result.fromText + sep + result.toText;
        }

        return result;
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

    DateHelper.prototype.isValidBusinessDate = function(d){
        var isValid = false;

        var businessHours = this.businessHours;
        if(businessHours.length > 0){ 
            
            $.each(this._getBusinessHours(d), function(i, h){
                var openTime = moment(moment.utc(moment.duration(h.openTime, 'minutes').asMilliseconds()).format('H:mm'), 'H:mm'),
                    closeTime = moment(moment.utc(moment.duration(h.closeTime, 'minutes').asMilliseconds()).format('H:mm'), 'H:mm');

                var testDate = moment(d.clone().format('H:mm'), 'H:mm');

                isValid = testDate.isBetween(openTime, closeTime) || testDate.isSame(openTime) || testDate.isSame(closeTime);

                if(isValid) return false;
            });     
        }else{
            isValid = true;
        }

        return isValid;
    }

    DateHelper.prototype.getValidBusinessDate = function(d){
        var that = this,
            now = this.getNow(),
            maxMinutes = 0;

        //bugfix getValidBusinessDate only returns dates from now or in the future
        if(d.isBefore(now)){
            d.date(now.date());
        }

        while(!this.isValidBusinessDate(d) || (maxMinutes >= 7*24*60)){
            d = d.add(that.roundMinutes, "minutes");
            
            // Prevent infinite loop by stopping after 1 full week
            maxMinutes += that.roundMinutes;
        }

        return d;
    }

    DateHelper.prototype._getBusinessHours = function(d){
        var businessHours = this.businessHours;
        if(businessHours.length > 0){ 
            return businessHours.filter(function(bh){ return bh.isoWeekday == d.isoWeekday(); });
        }else{
            return [];
        }
    }

    DateHelper.prototype._makeStartOfBusinessDay = function(m) {
        var startOfBusinessDay = m.clone().hour(this.startOfDayHours).minutes(0).seconds(0).milliseconds(0);

        var businessHours = this.businessHours;
        if(businessHours.length > 0){
            var businessHoursForDay = this._getBusinessHours(m)
            if(businessHoursForDay.length > 0){
                var openTime = moment(moment.utc(moment.duration(businessHoursForDay[0].openTime, 'minutes').asMilliseconds()).format('H:mm'), 'H:mm');  
                startOfBusinessDay.hour(openTime.hour()).minute(openTime.minute());               
            }
        }             
        return this.getValidBusinessDate(startOfBusinessDay);
    };

    DateHelper.prototype._makeEndOfBusinessDay = function(m) {
        var endOfBusinessDay = m.clone().hour(this.endOfDayHours).minutes(0).seconds(0).milliseconds(0);

        var businessHours = this.businessHours;
        if(businessHours.length > 0){
            var businessHoursForDay = this._getBusinessHours(m).sort(function(a, b){ return a.closeTime < b.closeTime; });
            if(businessHoursForDay.length > 0){
                var closeTime = moment(moment.utc(moment.duration(businessHoursForDay[0].closeTime, 'minutes').asMilliseconds()).format('H:mm'), 'H:mm');
                endOfBusinessDay.hour(closeTime.hour()).minute(closeTime.minute());
            }
             
        }

        return this.getValidBusinessDate(endOfBusinessDay);
    };

    return DateHelper;

});