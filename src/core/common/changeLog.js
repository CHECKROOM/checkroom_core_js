define([
	'common/code', 
	'common/image',
	'common/attachment',
	'common/keyValues',
	'common/slimdown',
	'moment'
], function(codeHelper, imageHelper, attachmentHelper, keyValueHelper, slimdownHelper, moment){
	var that = {};

	var sd = new Slimdown();

	that.getChangeLogEvent =  function(evt, doc, user, locations, group, profile, settings, getDataSource){
		var unknownText = "Unknown",
			hoursFormat = (profile.timeFormat24) ? "H:mm" : "h:mma";

		evt.friendlyText = evt.action;
		evt.by = evt.by || {};
		evt.by.name = evt.by.name || 'CHEQROOM';

		var arg = evt.arg || {};
		var params = {
			by: evt.by,
			kind: evt.kind
		}
		if(arg.customerName && evt.by.name != arg.customerName){
            params.contact = { id: arg.customerId, name: arg.customerName || unknownText };
        };

        var location = locations.find(function(loc){ return loc._id == (arg.location || arg.locationId); }) || {};
        var activeLocations = locations.filter(function(loc){ return loc.status == "active"; });
        var locationName = activeLocations.length > 0?" at " + (location.name || unknownText) :"";
        var byName = evt.by.name;

        var getLocationById = function(locId){
        	return locations.find(function(l){
        		return l._id == locId;
        	});
        };

        var getFlagById = function(flagId) {
        	return group.itemFlags.find(function(flag){
        		return flag.id == flagId;
        	});
        };

        var getLabelById = function(labels, labelId){
        	return group[labels].find(function(l){
        		return l.id == labelId;
        	});
        }

        var getFieldById = function(fieldName){
            var fieldDictionary = {
                'check-out': 'orderFields',
                'reservation': 'reservationFields',
                'item': 'itemFields',
                'contact': 'customerFields',
                'kit': 'kitFields'
            };

            return group[fieldDictionary[evt.kind]].find(function(f){
                return f.name == fieldName;
            })
        }

        var getAttachmentImageUrl = function(attachment, size){
        	// is url
            if(typeof attachment === "string" && attachment.indexOf('http') == 0) return attachment;

            var attId = typeof attachment === "string"?attachment:attachment._id || attachment.id;

            return imageHelper.getImageCDNUrl(settings, group.id, size?attachmentHelper.makeFileNameJpg(attId):attId, size);
        };
        var getItemImageUrl = function(item, size){
            return imageHelper.getImageCDNUrl(settings, group.id, typeof(item) == "string"?item:(item.cover || item._id || item.id), size);
        }

        var getCheckoutLink = function(id, text){
        	return "<a href='#check-outs/" + id + "' class='transaction-link' data-kind='order' data-id='" + id + "'>" + text + "</a>";
        }
        var getReservationLink = function(id, text){
        	return "<a href='#reservations/" + id + "' class='transaction-link' data-kind='reservation' data-id='" + id + "'>" + text +  "</a>";
        }
        var getLink = function(href, text){
        	return "<a href='" + href + "'>" + text + "</a>";
        }
        var getContactLink = function(id, text){
        	return getLink("#contacts/" + id, text);
        }   
        var getKitLink = function(id, text){
        	return getLink("#kits/" + id, text);
        } 
        var getMessagesBlock = function(messages){
        	if(messages.length == 0) return "";

        	var temp = messages.map(function(m){ 
        		return "<li class='list-group-item'>" + m + "</li>";
        	}).join("");

        	return "<ul class='list-group field-group'>" + temp + "</ul>";
        }  
        var getMessageBlock = function(message){
        	return message?getMessagesBlock([message]):"";
        }  

        switch(evt.action){
        	case "changeCategory":
        		var category = arg.category? arg.category.split('.').pop().replace(/_/igm, " ").capitalize(): unknownText;
        		evt.friendlyText = byName + " updated category to " + category;
        		break;
        	case "addCodes":
        	case "removeCodes":
            	var code = arg.codes && arg.codes.length > 0?arg.codes[0]:unknownText;
        		
        		switch(evt.action){
        			case "addCodes":
        				evt.friendlyText = byName + " added qr code " + code + " <img class='qrcode' title='" + code + "' src='" + codeHelper.getQRCodeUrl(settings.qrCodeUtilsApi, code, 'S') + "' />";
                		break;
        			case "removeCodes":
        				evt.friendlyText = byName + " removed qr code " + code
        				break;
        		}
        		break;
        	case "addBarcode":
        	case "removeBarcode":
        		var barcode = arg.barcode || unknownText;

        		switch(evt.action){
        			case "addBarcode":
        				evt.friendlyText = byName + " added barcode " + barcode + " <img class='barcode' title='" + barcode + "' src='" + codeHelper.getQRCodeUrl(settings.barcodeUtilsApi, barcode, 'S') + "' />";
                		break;
        			case "removeBarcode":
        				evt.friendlyText = byName + " removed barcode " + barcode
        				break;
        		}
        		break;
        	case "archive":
        		var auto = !params.by._id;
        		evt.friendlyText = byName + (auto?" auto-":" ") + "archived " + evt.kind;
    			break;
    		case "undoArchive":
    			evt.friendlyText = byName + " unarchived " + evt.kind;
    			break;
            case "takeCustody":
            case "item.takeCustody":
            case "kit.takeCustody":
             	var id = evt.obj,
             		name = arg.custodyName || unknownText;

             	if(evt.action == "takeCustody"){
                	evt.friendlyText = byName + " placed " + evt.kind + " in custody of " + getContactLink(evt.obj, name);
                }else if(evt.action == "item.takeCustody"){
                	evt.friendlyText = byName + " took " + getLink("#items/" + id, "item") + " custody";
                }else{
                	evt.friendlyText = byName + " took " + getLink("#kits/" + id, "kit") + " custody";
                }
                break;
            case "transferCustody":
            case "item.transferCustody":  
            case "kit.transferCustody":  
            	var id = evt.obj;

	                if(evt.by != arg.hadCustodyName){
	                	var name = arg.hadCustodyName || unknownText;

	                	if(evt.action == "transferCustody"){
	                    	evt.friendlyText =  byName + " transfered " + evt.kind + " custody from " + getContactLink(arg.hadCustody, name);
	                	}else if(evt.action == "item.transferCustody"){
	                		evt.friendlyText = byName + " transfered " + getLink("#items/" + id, "item") + " custody from " + getContactLink(arg.hadCustody, name);
	                	}else{
	                		evt.friendlyText = byName + " transfered " + getLink("#kits/" + id, "kit") + " custody from " + getContactLink(arg.hadCustody, name);
	                	}
	                }else{
	                	var name = arg.custodyName || unknownText;

	                	if(evt.action == "transferCustody"){
	                    	evt.friendlyText = byName + " transfered " + evt.kind + " custody to " + getContactLink(arg.custody, name);
	                	}else if(evt.action == "item.transferCustody"){
	                		evt.friendlyText = byName + " transfered " + getLink("#items/" + id, "item") + " custody to " + getContactLink(arg.custody, name);
	                	}else{
	                		evt.friendlyText = byName + " transfered " + getLink("#kits/" + id, "kit") + " custody to " + getContactLink(arg.custody, name);
	                	}
	                }
                break;
            case "releaseCustody":
           	case "item.releaseCustody":
           	case "kit.releaseCustody":
            	var id = evt.obj,
            		name = arg.hadCustodyName || unknownText;

            	if(evt.action == "releaseCustody"){
                	evt.friendlyText = byName + " released " + evt.kind + " custody of " + getContactLink(arg.hadCustody, name) + locationName;
                }else if(evt.action == "item.releaseCustody"){
                	evt.friendlyText = byName + " released " + getLink("#items/" + id, "item") + " custody";
                }else{
                	evt.friendlyText = byName + " released " + getLink("#kits/" + id, "kit") + " custody";
                }
                break;
            case "setFlag":
            case "clearFlag":
                var flag = getFlagById(evt.action == "setFlag"?arg.flag:arg.oldFlag) || {};
                var flagName = flag.name || unknownText;
                var flagColor = flag.color || "orange";
                var message = arg && arg.message?arg.message: "";
                var hasAttachments = arg && arg.attachments && arg.attachments.length > 0;
                var attachments = arg && arg.attachments?arg.attachments.map(function(att){ 
                        return {
                            id: att,
                            url: getAttachmentImageUrl(att, 'XS') 
                        };
                    }):[]

                evt.by = {
                    kind: 'flag',
                    name:  evt.by.name,
                    color: evt.action == "setFlag"?flagColor:'#999'
                };

                switch(evt.action){
                	case "setFlag":
                		evt.friendlyText = byName + " set flag <span style='color:" + flagColor + "'><i class='fa fa-flag'></i> " + flagName + "</span>" + (message?"<ul class='list-group field-group'><li class='list-group-item'><small class='text-muted'>Message</small><br />" + message + "</li>" + (hasAttachments?"<li class='list-group-item'><small class='text-muted'>Attachments</small><div>" + (attachments.map(function(att){  return "<img class='flag-attachment' data-id='" + att.id + "' src='" + att.url + "' style='display:inline-block;margin-right:5px;' />";  }).join("")) + "</div></li>":"") + "</ul>":"");
                		break;
                	case "clearFlag":
                		evt.friendlyText = byName + " cleared flag <span style='text-decoration:line-through;'><i class='fa fa-flag'></i> " + flagName + "</span>" + (message?"<ul class='list-group field-group'><li class='list-group-item'><small class='text-muted'>Message</small><br />" + message + "</li>" + (hasAttachments?"<li class='list-group-item'><small class='text-muted'>Attachments</small><div>" + (attachments.map(function(att){  return "<img class='flag-attachment' data-id='" + att.id + "' src='" + att.url + "' style='display:inline-block;margin-right:5px;' />";  }).join("")) + "</div></li>":"") + "</ul>":"");
                		break;
                }
            	break;
        	case "sendMessage":
                evt.by = {
                    kind: 'email',
                    name: 'CHEQROOM'
                }

                var id = evt.id,
                	body = $(".container-padding", arg.request.body).text(),
                	to = arg.request.to, 
                	subject = arg.request.subject;

                evt.friendlyText = "Sent mail to " + to + " <ul class='list-group field-group'><li class='list-group-item'><div class='mail-subject'>" + subject + "</div><div class='mail-body multiline-text-truncate'>" + body + "</div><div><a href='javascript:void(0)' class='open-email' data-id='" + id + "'>View email</a></div></li></ul>";
                break;
            case "block":
            case "undoBlock":
            	var message = arg?arg.message:null;
            	var friendlyAction = evt.action == "block"? "blocked": "unblocked";

                evt.friendlyText = byName + " " + friendlyAction + " contact " + getMessageBlock(message);    	  
            	break;
            case "import":
                evt.friendlyText = byName + " created " + evt.kind + " from import";
                break;
            case "attach":
                var attachment = arg && arg.attachments.length > 0 && arg.attachments[0];
                var attachmentId = typeof(attachment) === "string"?attachment:attachment.attachmentId;
                var isPdf = attachmentId.indexOf('.pdf') != -1;
                var attachmentUrl = arg && arg.attachments.length > 0?getAttachmentImageUrl(attachmentId, isPdf?'S':'XS'):null;
                var downloadUrl = arg && arg.attachments.length > 0?(getDataSource("attachments").getBaseUrl() + attachmentId + "?download=true"):"javascript:void(0);";

                evt.friendlyText = byName + " added attachment " + (downloadUrl?"<a class='open-attachment' data-id='" + attachmentId + "' href='" + downloadUrl + "' target='_blank'>":"") + (attachmentUrl?"<img " + (isPdf?"class='pdf'":"") + " src='" + attachmentUrl + "' />":"") + (downloadUrl?"</a>":"");
                break;
            case "detach":
                evt.friendlyText = byName + " removed attachment";
                break;
            case "order.checkout":
            case "checkout":
            case "checkoutAgain":
            	var id = evt.obj,
            		contact = params.contact;

            	if(evt.action == "order.checkout"){
	            	switch(evt.kind){
	            		case "item":
	            			evt.friendlyText = byName + " " + getCheckoutLink(id, "checked out") + " item " + (contact?"to " + getContactLink(contact.id, contact.name):"") + locationName;
	            			break;
	            		case "contact":
	            			evt.friendlyText = byName + " " + getCheckoutLink(id, "checked out") + " equipment" + locationName;
	            			break;
	            	}
	            }else{
            		evt.friendlyText = byName + " checked out equipment";
	            }
            	break;
            case "order.checkin":
            case "checkin":
            	var id = evt.obj,
            		contact = params.contact;

            	if(evt.action == "order.checkin"){
	            	switch(evt.kind){
	                    case "item":
	                        evt.friendlyText = byName + " " + getCheckoutLink(id, "checked in") + " item " + (contact?"from " + getContactLink(contact.id, contact.name):"") + locationName;
	                        break;
	                    case "contact":
	                        evt.friendlyText = byName + " " + getCheckoutLink(id, "checked in") + " equipment" + locationName;
	                        break;
	                }
	            }else{
	            	var due = doc.due,
	                    to = evt.created,
	                    summary = "",
	                    checkedInItems = (arg.items || []),
	                    totalItems = checkedInItems.length;
	                    
	                if(due){
	                    var duration = moment.duration(due.diff(evt.created));
	                    if(to.isAfter(due)){
	                        summary = duration.humanize(true).replace(" ago","").replace("in ", "") + " late";
	                    }else if(to.isBefore(due)){
	                        summary = duration.humanize(true).replace(" ago","").replace("in ", "") + " early";
	                    }   
	                }
	                var dueDate = due?due.format("D MMM " + hoursFormat):"Unknown";
	                var items = doc.items.filter(function(it){
	                    it.imageUrl = getItemImageUrl(it, "XS");
	                    return checkedInItems.indexOf(it._id) != -1; 
	                });

                    evt.friendlyText = byName + " checked in equipment " + summary + getMessagesBlock(items.map(function(it){
                        return "<div class='media'><div class='media-left'><img class='item-image' src='" + it.imageUrl + "' /></div><div class='media-body'><a href='#items/"+ it._id + "'>" + it.name + "</a><br /><small class='text-muted text-truncate item-info'>" + it.codes.map(function(code){ return "<i class='fa fa-qrcode'></i> " + code; }) + it.barcodes.map(function(code){ return "<i class='fa fa-barcode'></i> " + code; }) + "</small></div></div>";
                    }));
	            }
            	break;
            case "order.undoCheckout":
           	case "undoCheckout":
            	var id = evt.obj,
            		contact = params.contact;

            	if(evt.action == "undoCheckout"){
            		evt.friendlyText = byName + " undid check-out";
            	}else{
	            	switch(evt.kind){
	                    case "item":
	                        evt.friendlyText = byName + " undid item " + getCheckoutLink(id, "check out") + (contact?" for " + getContactLink(contact.id, contact.name):"");
	                        break;
	                    case "contact":
	                        evt.friendlyText = byName + " undid equipment " + getCheckoutLink(id, "check out");
	                        break;
	                }
	            }
            	break;
            case "order.extend":
            case "extend":
            	var id = evt.obj,
            		contact = params.contact,
            		dueDate = arg.due.format("MMM DD");

            	if(evt.action == "extend"){
            		evt.friendlyText = byName + " extended check-out until " + dueDate;
            	}else{
            		// Don't show contact info for contact kind
            		if(evt.kind == "contact") contact = null;
	            	evt.friendlyText = byName + " extended " + getCheckoutLink(id, "check out") + (contact?" from " + getContactLink(contact.id, contact.name):"") + " until " + dueDate;
            	}
            	break;
            case "reservation.makeOrder":
            case "makeOrder":
                if(evt.action == "makeOrder"){
                    evt.friendlyText = byName + " converted reservation to " + getCheckoutLink(evt.obj, "check-out");
                }else{
            	    evt.friendlyText = byName + " created check-out from " + getReservationLink(evt.obj, "reservation");
                }
            	break;
            case "reserve":
            case "reservation.reserve":
            	var id = evt.obj,
            		contact = params.contact;

            	if(evt.action == "reserve"){
            		evt.friendlyText = byName + " reserved equipment";
            	}else{
            		var friendlyKind = evt.kind == "item"?" item ":" equipment ";
            		if(evt.kind == "contact") contact = null;

            		evt.friendlyText = byName + " " + getReservationLink(id, "reserved") + friendlyKind + (contact?"for " + getContactLink(contact.id, contact.name):"") + locationName;
            	}
            	break;
            case "cancel":
            case "reservation.cancel":
            	var id = evt.obj,
            		contact = params.contact,
            		message = arg?arg.message:null;

            	if(evt.action == "cancel"){
            		evt.friendlyText = byName + " cancelled reservation" + getMessageBlock(message);
            	}else{
            		if(evt.kind == "contact") contact = null;
            		evt.friendlyText = byName + " cancelled " + getReservationLink(id, "reservation") + (contact?" for " + getContactLink(contact.id, contact.name):"") + locationName;
            	}
            	break;
            case "undoReserve":
           	case "reservation.undoReserve":
           		var id = evt.obj,
           			contact = params.contact; 

           		if(evt.action == "undoReserve"){
           			evt.friendlyText = byName + " undid reservation";
           		}else{
           			if(evt.kind == "contact") contact = null;
            		evt.friendlyText = byName + " undid " + getReservationLink(id, "reservation") + (contact?" from " + getContactLink(contact.id, contact.name):"") + locationName;
           		}
            	break;
        	case "close":
        	case "reservation.close":
        		var id = evt.obj,
        			message = arg?arg.message:null,
        			contact = params.contact;

        		if(evt.action == "close"){
            		evt.friendlyText = byName + " closed reservation" + getMessageBlock(message);
            	}else{
            		if(evt.kind == "contact") contact = null;
            		evt.friendlyText = byName + " closed " + getReservationLink(id, "reservation") + (contact?" for " + getContactLink(contact.id, contact.name):"") + locationName;
            	}
            	break;
            case "undoClose":
            case "reservation.undoClose":
            	var id = evt.obj,
        			contact = params.contact;

            	if(evt.action == "undoClose"){
            		evt.friendlyText = byName + " undid close reservation";
            	}else{
            		if(evt.kind == "contact") contact = null;
            		evt.friendlyText = byName + " undid close " + getReservationLink(id, "reservation") + (contact?" frop " + getContactLink(contact.id, contact.name):"") + locationName;;
            	}
            	break;
            case "kit.addItems":
            case "addItems":
            	var id = evt.obj,
            		items = arg && arg.items?arg.items:[],
            		count = items.length;
            	if(evt.action == "addItems"){
            		evt.friendlyText = byName + " added " + count + " item".pluralize(items.length != -1);
            	}else{
            		evt.friendlyText = byName + " added item to " + getKitLink(id, "kit");
            	}
            	break;
            case "kit.removeItems":
            case "removeItems":
            	var id = evt.obj,
            		items = arg && arg.items?arg.items:[],
            		count = items.length;
            	if(evt.action == "removeItems"){
            		evt.friendlyText = byName + " removed " + count + " item".pluralize(items.length != -1);
            	}else{
            		evt.friendlyText = byName + " removed item from " + getKitLink(id, "kit");
            	}
            	break;
            case "kit.duplicate":
            	evt.friendlyText = byName + " created kit from duplicate";
            	break;
            case "setName":
            	var value = arg.name || unknownText;
            	evt.friendlyText = byName + " updated " + evt.kind + " name to " + value;
            	break;
            case "addComment":
            case "updateComment":
            	var comment = arg.comment.replace(/\n/igm,'<br />');
                evt.friendlyText = byName + " wrote comment <div class='card comment-card'><div class='card-block'><span class='gu-truncate'>" + comment + "</span></div></div>";
                break;
            case "removeComment":
                evt.friendlyText = byName + " removed comment"
                break;
            case "setAllowedActions":
            	var custodyChanged = arg.allowCustody != arg.oldAllowCustody,
            		reserveChanged = arg.allowReserve != arg.oldAllowReserve,
            		orderChanged = arg.allowOrder != arg.oldAllowOrder;

            	var available = [],
            		unavailable = [];

            	if(custodyChanged){
            		if(arg.allowCustody){
            			available.push("Custody");
            		}else{
            			unavailable.push("Custody");
            		}
            	}
            	if(reserveChanged){
            		if(arg.allowReserve){
            			available.push("Reservations")
            		}else{
            			unavailable.push("Reservations");
            		}
            	}
            	if(orderChanged){
            		if(arg.allowOrder){
            			available.push("Check-outs");
            		}else{
            			unavailable.push("Check-outs");
            		}
            	}

            	var messages = [];
            	if(available.length > 0){
            		messages.push("<small>Available for</small><br />" + available.joinAdvanced(',', ' and '));
            	}
            	if(unavailable.length > 0){
            		messages.push("<small>Unavailable for</small><br />" + unavailable.joinAdvanced(',', ' and '));
            	}

            	evt.friendlyText = byName + " changed " + evt.kind + " permission to" + getMessagesBlock(messages);
            	break;
            case "setField":
            case "clearField":
            case "renameField":
              	var field = arg.field || unknownText;
                var fieldDef = getFieldById(field) || {};

           		switch(evt.action){
           			case "setField":
		           		var fieldValue = arg.value;
		                var isDate = moment(fieldValue.toString().split(" (")[0], "ddd MMM DD YYYY HH:mm:ss [GMT]ZZ", true).isValid();
		               
		                var value = (isDate?moment(arg.value).format("MMM DD YYYY" + (fieldDef.editor == 'datetime'?' [at] ' + hoursFormat:'')):sd.render(arg.value));

		                evt.friendlyText = byName + " set " + evt.kind + " field " + getMessageBlock("<small class='text-muted'>" + field + "</small><br />" + value);
		                break;
		            case "clearField":
		            	evt.friendlyText = byName + " cleared " + field + " field";
		            	break;
		            case "renameField":
		            	evt.friendlyText = byName + " renamed field " + arg.oldName + " to " + arg.newName;
		            	break;
           		}
                break;
            case "setFields":
                var fields = Object.keys(arg).map(function(fieldKey){ 
                    var fieldValue = arg[fieldKey] || "";

                    var fieldDef = getFieldById(fieldKey) || {};

                    var isDate = moment(fieldValue.toString().split(" (")[0], "ddd MMM DD YYYY HH:mm:ss [GMT]ZZ", true).isValid();

                    return { 
                        name: fieldKey, 
                        value: isDate?moment(arg[fieldKey]).format("MMM DD YYYY" + (fieldDef.editor == 'datetime'?' [at] ' + hoursFormat:'')):sd.render(arg[fieldKey]) 
                    } 
                });

                evt.friendlyText = byName + " set " + evt.kind + " field".pluralize(fields.length > 1) + getMessagesBlock(fields.map(function(f){
                	return "<small class='text-muted'>" + f.name + "</small><br />" + f.value;
                }));
                break;
            case "create":
            	var getFieldName = function(key){
            		if(key == "residualValue"){
            			return "Residual value";
            		}
            		if(key == "warrantyDate"){
            			return "Warranty date";
            		}

            		return key.capitalize();
            	}

            	var fields = Object.keys(arg).filter(function(fieldKey){
                    var fieldValue = arg[fieldKey] || "";

                    if(!fieldValue) return false;

            		if(evt.kind != "item"){
            			if(['check-out', 'reservation'].indexOf(evt.kind) != -1){
	            			return false;
	            		}

                        if(evt.kind == 'contact'){
                            return ['category', 'user'].indexOf(fieldKey) == -1
                        }

            			return ['category', 'kind'].indexOf(fieldKey) == -1;
            		}

            		return true;
            	}).map(function(fieldKey){ 
                    var fieldValue = arg[fieldKey] || "";

                    var isDate = moment(fieldValue.toString().split(" (")[0], "ddd MMM DD YYYY HH:mm:ss [GMT]ZZ", true).isValid();
                   	var value = "";
                    var fieldDef = getFieldById(fieldKey) || {};

                   	if(isDate){
                   		value = moment(arg[fieldKey]).format("MMM DD YYYY" + (fieldDef.editor == 'datetime'?' [at] ' + hoursFormat:''));
                   	}else if(fieldKey == "category"){
                   		value = keyValueHelper.getCategoryNameFromKey(arg[fieldKey]).capitalize();
                   	}else if(fieldKey == "location"){
                   		var loc = getLocationById(fieldValue) || {};
                   		value = loc.name || unknownText;
                   	}else{
                   		value = sd.render(arg[fieldKey]);
                   	}

                    return { 
                        name: getFieldName(fieldKey), 
                        value: value
                    } 
                });


            	evt.friendlyText = byName + " created " + evt.kind + getMessagesBlock(fields.map(function(f){
                	return "<small class='text-muted'>" + f.name + "</small><br />" + f.value;
                }));
            	break;
            case "update":
            	if(arg.hasOwnProperty("name")){
                    evt.friendlyText = byName + " updated " + evt.kind + " name to " + arg.name;
                }else if(arg.hasOwnProperty("kind") && arg.kind == "importer"){
                    evt.friendlyText = byName + " updated " + evt.kind + " from import";
                }else{
                    switch(evt.kind) {
                        case "item":
                            if(arg.hasOwnProperty("purchasePrice")){
                                arg.field = "Purchase price";

                                if(arg.purchasePrice){
                                    arg.value = arg.purchasePrice + " " + profile.currency;
                                }
                            }else if(arg.hasOwnProperty("warrantyDate")){
                                arg.field = "Warranty date";
                                if(arg.warrantyDate){
                                    arg.value = arg.warrantyDate.format("MMM DD YYYY");
                                }
                            }else if(arg.hasOwnProperty("purchaseDate")){
                                arg.field = "Purchase date";
                                if(arg.purchaseDate){
                                    arg.value = arg.purchaseDate.format("MMM DD YYYY");
                                }
                            }else if(arg.hasOwnProperty("brand")){
                                arg.field = "Brand";
                                if(arg.brand){
                                    arg.value = arg.brand;
                                }
                            }else if(arg.hasOwnProperty("model")){
                                arg.field = "Model";
                                if(arg.model){
                                    arg.value = arg.model;
                                }
                            }

                            if(!arg.value){
                                evt.friendlyText =  byName + " cleared " + arg.field + " field";
                            }else{
                                evt.friendlyText = byName + " set " + evt.kind + " field" + getMessageBlock("<small class='text-muted'>" + arg.field + "</small><br />" + arg.value);
                            }
                            break;
                        case "contact":
                            if(arg.hasOwnProperty("email")){
                                evt.friendlyText = byName + " updated contact email to " + arg.email;
                            }else{
                                evt.friendlyText = byName + " updated contact";
                            }
                            break;
                        case "kit":
                            evt.friendlyText = byName + " updated kit name to " + arg.name;
                            break;
                    }
                    
                }
            	break;
            case "duplicate":
                evt.friendlyText = byName + " duplicated item " + arg.times + " times";
                break;
            case "expire":
            	var message = arg?arg.message:null;
            	evt.friendlyText = byName + " expired item" + getMessageBlock(message);
            	break;
            case "undoExpire":
            	evt.friendlyText = byName + " unexpired item";
            	break;
            case "setCover":
            	evt.friendlyText = byName + " updated cover image";
            	break;
            case "scanCode":
            	var code = arg.code || unknownText;
            	switch(arg.kind){
            		case "qrcode":
            			evt.friendlyText = 	byName + " scanned QR code " + code;    	
            			break;
            		case "barcode":
            			evt.friendlyText = byName + " scanned barcode " + code;
            			break;
            	}
            	break;
            case "item.duplicate":
            	var id = evt.obj;
            	evt.friendlyText = byName + " created " + getLink("#items/" + id, "item") + " from duplicate";
            	break;
            case "setCatalog":
            	var fields = Object.keys(arg).map(function(fieldKey){ 
                    var fieldValue = arg[fieldKey] || "";

                    return { 
                        name: fieldKey, 
                        value: arg[fieldKey] 
                    } 
                });
                evt.friendlyText = byName + " set catalog" + getMessagesBlock(fields.map(function(f){
                	return "<small class='text-muted'>" + f.name + "</small><br />" + f.value;
                }));
            	break;
            case "setLabel":
            case "clearLabel":
            	var labelId = arg.labelId;
                var labelDictionary = {
                    'cheqroom.types.order': 'orderLabels',
                    'cheqroom.types.reservation': 'reservationLabels',
                    'cheqroom.types.item': 'itemLabels',
                    'cheqroom.types.customer': 'customerLabels',
                    'cheqroom.types.kit': 'kitLabels'
                };
                var label = getLabelById(labelDictionary[doc.crtype], labelId) || { name: arg.labelName, color: arg.labelColor };
            		
            	evt.friendlyText = byName + " set <span class='label-tag' style='background-color:" + label.color + ";'></span> " + label.name;
            	break;
            case "spotchecks.close":
            	var id = evt.obj,
                    allFound = (arg.numChecked == arg.numTotal && arg.numUnchecked == 0 && arg.numUnexpected == 0),
                    numCheckedProgress = arg.numChecked > 0?Math.round((arg.numChecked / arg.numTotal)*100):0,
                    numUncheckedProgress = arg.numUnchecked > 0?Math.round((arg.numUnchecked / arg.numTotal)*100):0,
                    numUnexpectedProgress = arg.numUnexpected > 0?Math.round((arg.numUnexpected / arg.numTotal)*100):0,
                    numChecked = arg.numChecked,
                    numUnchecked = arg.numUnchecked,
                    numTotal = arg.numTotal,
                    numUnexpected = arg.numUnexpected,
                    checked = arg.items?arg.items.checked_scanner && arg.items.checked_scanner.slice(0,2).map(function(it){
                         return getItemImageUrl(it, "XS");
                    }).concat(arg.numChecked > 2?imageHelper.getTextImage("+" + (arg.numChecked-2), 'S'):[]):[],
                    unchecked = arg.items?arg.items.unchecked && arg.items.unchecked.slice(0,2).map(function(it){
                         return getItemImageUrl(it, "XS");
                    }).concat(arg.numUnchecked > 2?imageHelper.getTextImage("+" + (arg.numUnchecked-2), 'S'):[]):[],
                    unexpected = arg.items?arg.items.unexpected && arg.items.unexpected.slice(0,2).map(function(it){
                         return getItemImageUrl(it, "XS");
                    }).concat(arg.numUnexpected > 2?imageHelper.getTextImage("+" + (arg.numUnexpected-2), 'S'):[]):[];

                if(evt.kind == "item"){
                    evt.friendlyText = byName + " did a <a href='javascript:void(0)' class='spotcheck' data-id='" + id + "'>spotcheck</a>";
                }else{
                    evt.friendlyText = byName + " did a spotcheck <ul class='list-group field-group spotcheck' data-id='"+ id +"'><li class='list-group-item'><div class='title'>" + (allFound?"<div class='success'><i class='fa fa-check-circle'></i> All " + numTotal + " Items checked</div>":"<div class='warning'><i class='fa fa-exclamation-circle'></i> " + numUnchecked + " of "+ numTotal +" Items unchecked</div>") + "</div><div class='multi-progress'><div class='found-progress' style='width:"+ numCheckedProgress +"%'></div><div class='missing-progress' style='width:"+ numUncheckedProgress +"%'></div><div class='unexpected-progress' style='width:" + numUnexpectedProgress + "%'></div></div> " + (numChecked?"<div class='media legend-item'><div class='media-left'><span class='legend-color success'></span></div><div class='media-body'><div class='item-images'>" + (checked.map(function(src){ return "<img class='item-image' src='" + src + "' />"; }).join("")) + "</div><div>Checked</div><div class='text-muted'>" + numChecked + " items</div></div></div>":"") + (numUnchecked?"<div class='media legend-item'><div class='media-left'><span class='legend-color warning'></span></div><div class='media-body'><div class='item-images'>"+ (unchecked.map(function(src){ return "<img class='item-image' src='" + src + "' />"; }).join("")) +"</div><div>Unchecked</div><div class='text-muted'>"+ numUnchecked + " items</div></div></div>":"") + (numUnexpected?"<div class='media legend-item'><div class='media-left'><span class='legend-color gray'></span></div><div class='media-body'><div class='item-images'>"+ (unexpected.map(function(src){ return "<img class='item-image' src='" + src + "' />"; }).join("")) +"</div><div>Unexpected</div><div class='text-muted'>"+ numUnexpected + " items</div></div></div>":"") + "</li></ul>";
                }
            	break;
            case "changeLocation":
            	var loc = arg.name || unknownText;
            	evt.friendlyText = byName + " updated location to " + loc;
            	break;
            case "updateGeo":
            	var address = (arg.address || unknownText).split(",").map(function(v){ return $.trim(v); });
            	evt.friendlyText = byName + " updated geo position to " + getMessageBlock("<address>" + address.map(function(line){ return "<span>" + line + "</span>"; }).join("") + "</address>");
            	break;
            case "changeKind":
                evt.friendlyText = byName + " changed kind to " + arg.kind;
                break;
        }

        return evt;
	}

	return that;
})