	cbb.cache = function() {
		var loaded = {};
		return {
			store: function(key,value) {
				loaded[key] = value;
				//if (window.sessionStorage) {
				//	window.sessionStorage.setItem(key,value);
				//}
				return this;
			},
			load: function(key) {
				if (key in loaded) {
					return loaded[key];
				//} else if (window.sessionStorage) {
				//	var sKey = window.sessionStorage.getItem(key);
				//	return sKey ? sKey : false;
				} else {
					return false;
				}
			},
			list: function() {
				if (arguments[0] != undefined) {
					var snippet = arguments[0],
							regMatch = new RegExp('^'+snippet),
							fLoaded = {},
							keys = _(_(loaded).keys()).chain().select(function(v){ return !!v.match(regMatch)}).value();
					_(keys).each(function(v,k) { fLoaded[k] = v; });
					return fLoaded;
				} else {
					return loaded;
				}
			}
		}
	}();
	_.extend(cbb.cache,Backbone.Events);
