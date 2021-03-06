/*
 * Attachment helpers
 * @copyright CHECKROOM NV 2015
 */
define(['moment'],function (moment) {
     var IMAGES = ['jpg', 'jpeg', 'png', 'gif'];
      

    /**
     * Provides attachment related helper methods
     */
    return {
        /**
         * getImgFileNameFromName
         *
         * @memberOf common
         * @name  common#getImgFileNameFromName
         * @method
         * 
         * @param  name 
         * @return {string}      
         */
        getImgFileNameFromName: function(name) {
            if( (name!=null) &&
                (name.length>0)) {
                return name.split(' ').join('_').split('.').join('_') + '.jpg';
            } else {
                // upload 2014-03-10 at 11.41.45 am.png
                return 'upload ' + moment().format('YYYY-MM-DD at hh:mm:ss a') + '.jpg';
            }
        },
        /**
         * makeFileNameJpg
         *
         * @memberOf common
         * @name  common#makeFileNameJpg
         * @method
         * 
         * @param  name
         * @return {string}    
         */
        makeFileNameJpg: function(name) {
            return (name.indexOf('.') >= 0) ? name.substr(0, name.lastIndexOf(".")) + ".jpg" : name;
        },
        /**
         * getFileNameFromUrl
         *
         * @memberOf common
         * @name  common#getFileNameFromUrl
         * @method
         * 
         * @param  url
         * @return {string}  
         */
        getFileNameFromUrl: function(url) {
            if (url) {
                var m = url.toString().match(/.*\/(.+?)\./);
                if (m && m.length > 1) {
                    return m[1];
                }
            }
            return "";
        },
        /**
         * isImage
         *
         * @memberOf common
         * @name  common#isImage
         * @method
         * 
         * @param  fileName
         * @return {boolean}  
         */
        isImage: function(fileName){
            var ext = this.getExt(fileName);
            return ($.inArray(ext, IMAGES) >= 0);
        },
        /**
         * getExt
         *
         * @memberOf common
         * @name  common#getExt
         * @method
         * 
         * @param  fileName
         * @return {string}  
         */
        getExt: function(fileName){
            var EXT = /(?:\.([^.]+))?$/;
            return (EXT.exec(fileName)[1] || "").toLowerCase();
        }
    };
});