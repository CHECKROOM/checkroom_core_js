/*
 * Image helpers
 */
define(['jquery'], function ($) {
    return {
    	/**
         * Returns an avatar image with the initials of the user
         * source: http://codepen.io/leecrossley/pen/CBHca 
         *
         * @memberOf  common
         * @name  common#getAvatarInitial
         * @method
         * 
         * @param  {string} name name for which to display the initials
         * @param  {string} size Possible values XS,S,M,L,XL
         * @return {string}	base64 image url    
         */
        getAvatarInitial: function (name, size) {
            name = name || "Unknown";

            var sizes = {
                "XS": 32,    
                "S": 64,
                "M": 128,
                "L": 256,
                "XL": 512
            };

            var colours = ["#1abc9c", "#2ecc71", "#3498db", "#9b59b6", "#34495e", "#16a085", "#27ae60", "#2980b9", "#8e44ad", "#2c3e50", "#f1c40f", "#e67e22", "#e74c3c", "#95a5a6", "#f39c12", "#d35400", "#c0392b", "#bdc3c7"];

            var nameSplit = name.split(" "),
                initials = nameSplit.length == 2?nameSplit[0].charAt(0).toUpperCase() + nameSplit[1].charAt(0).toUpperCase():nameSplit[0].charAt(0).toUpperCase();

            var charIndex = initials.charCodeAt(0) - 65,
                colourIndex = charIndex % colours.length;

            var canvasWidth = sizes[size],
                canvasHeight = sizes[size],
                canvasCssWidth = canvasWidth,
                canvasCssHeight = canvasHeight;

            var $canvas = $("<canvas />").attr({
                width: canvasWidth,
                height: canvasHeight
            });
            var context = $canvas.get(0).getContext("2d");

            if (window.devicePixelRatio) {
                $canvas.attr("width", canvasWidth * window.devicePixelRatio);
                $canvas.attr("height", canvasHeight * window.devicePixelRatio);
                $canvas.css("width", canvasCssWidth);
                $canvas.css("height", canvasCssHeight);
                context.scale(window.devicePixelRatio, window.devicePixelRatio);
            }

            context.fillStyle = colours[colourIndex];
            context.fillRect(0, 0, canvasWidth, canvasHeight);
            context.font = canvasWidth / 2 + "px Arial";
            context.textAlign = "center";
            context.fillStyle = "#FFF";
            context.fillText(initials, canvasCssWidth / 2, canvasCssHeight / 1.5);

            return $canvas.get(0).toDataURL();
        },
        /**
         * Returns an maintenace avatar image
         *
         * @memberOf  common
         * @name  common#getMaintenanceAvatar
         * @method
         * 
         * @param  {string} size Possible values XS,S,M,L,XL
         * @return {string} base64 image url    
         */
        getMaintenanceAvatar: function(size){
            return this.getIconAvatar(size, "f0ad");
        },
        /**
         * Returns an icon avatar image from FontAwesome collection
         *
         * @memberOf  common
         * @name  common#getIconAvatar
         * @method
         * 
         * @param  {string} size Possible values XS,S,M,L,XL
         * @return {string} base64 image url    
         */
        getIconAvatar: function(size, value, fontColorHex, backgroundColorHex, fontSize){
            var sizes = {
                "XS": 32,    
                "S": 64,
                "M": 128,
                "L": 256,
                "XL": 512
            };

            var canvasWidth = sizes[size],
                canvasHeight = sizes[size],
                canvasCssWidth = canvasWidth,
                canvasCssHeight = canvasHeight;

            if(!fontColorHex) fontColorHex = "#aaa";
            if(!backgroundColorHex) backgroundColorHex = "#f5f5f5";
            if(!fontSize) fontSize = canvasWidth / 2;


            var $canvas = $("<canvas />").attr({
                width: canvasWidth,
                height: canvasHeight
            });
            var context = $canvas.get(0).getContext("2d");

            if (window.devicePixelRatio) {
                $canvas.attr("width", canvasWidth * window.devicePixelRatio);
                $canvas.attr("height", canvasHeight * window.devicePixelRatio);
                $canvas.css("width", canvasCssWidth);
                $canvas.css("height", canvasCssHeight);
                context.scale(window.devicePixelRatio, window.devicePixelRatio);
            }

            context.fillStyle = backgroundColorHex;
            context.fillRect(0, 0, canvasWidth, canvasHeight);
            context.font = fontSize + "px FontAwesome";
            context.textAlign = "center";
            context.fillStyle = fontColorHex;
            context.fillText(String.fromCharCode("0x" + value), canvasCssWidth / 2, canvasCssHeight / 1.5);

            return $canvas.get(0).toDataURL();
        },
        getTextImage: function(text, size, fontColorHex, backgroundColorHex){
            var sizes = {
                "XS": 32,    
                "S": 64,
                "M": 128,
                "L": 256,
                "XL": 512
            };

            if(!fontColorHex) fontColorHex = "#aaa";
            if(!backgroundColorHex) backgroundColorHex = "#e5e5e5";

            var canvasWidth = sizes[size],
                canvasHeight = sizes[size],
                canvasCssWidth = canvasWidth,
                canvasCssHeight = canvasHeight;

            var $canvas = $("<canvas />").attr({
                width: canvasWidth,
                height: canvasHeight
            });
            var context = $canvas.get(0).getContext("2d");

            if (window.devicePixelRatio) {
                $canvas.attr("width", canvasWidth * window.devicePixelRatio);
                $canvas.attr("height", canvasHeight * window.devicePixelRatio);
                $canvas.css("width", canvasCssWidth);
                $canvas.css("height", canvasCssHeight);
                context.scale(window.devicePixelRatio, window.devicePixelRatio);
            }

            context.fillStyle = backgroundColorHex;
            context.fillRect(0, 0, canvasWidth, canvasHeight);
            context.font = canvasWidth / 2.7 + "px Arial";
            context.textAlign = "center";
            context.fillStyle = fontColorHex;
            context.fillText(text, canvasCssWidth / 2, canvasCssHeight / 1.5);

            return $canvas.get(0).toDataURL();
        },
        /**
         * getImageUrl 
         *
         * @memberOf  common
         * @name common#getImageUrl  
         * @method
         * 
         * @param  ds        
         * @param  pk        
         * @param  size      
         * @param  bustCache 
         * @return {string}           
         */
        getImageUrl: function(ds, pk, size, bustCache) {
            var url = ds.getBaseUrl() + pk + '?mimeType=image/jpeg';
            
            if (size && size != "orig") {
                url += '&size=' + size;
            }
            if  (bustCache) {
                url += '&_bust=' + new Date().getTime();
            }
            return url;
        },
        /**
         * getImageCDNUrl 
         *
         * @memberOf  common
         * @name  common#getImageCDNUrl
         * @method
         * 
         * @param  settings     
         * @param  groupId      
         * @param  attachmentId 
         * @param  size         
         * @return {string}              
         */
        getImageCDNUrl: function(settings, groupId, attachmentId, size) {
             // https://cheqroom-cdn.s3.amazonaws.com/app-staging/groups/nose/b00f1ae1-941c-11e3-9fc5-1040f389c0d4-M.jpg
            var url = "https://assets.cheqroomcdn.com/" + settings.amazonBucket + "/groups/" + groupId + "/" + attachmentId;
            if( (size) &&
                (size.length>0)) {
                var parts = url.split('.');
                var ext = attachmentId.indexOf('.') != -1?parts.pop():'';  // pop off the extension, we'll change it
                url = parts.join('.') + "-" + size + ".jpg";  // resized images are always jpg
            }
            return url;          
        },
        getNoImage: function(size){
            return this.getIconAvatar(size, 'f03e', 'rgba(0,0,0,0.2)', 'rgba(255,255,255,0.5)');     
        }
    }
});