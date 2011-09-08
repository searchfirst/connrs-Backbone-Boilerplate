	cbb.templates = function(window,document,undefined) {
		var cache = cbb.cache;
		return {
			compile: function(key) {
				var content, compiled_tpl;
				if (!key) {return false;}
				compiled_tpl = this.getCached(key);
				if (compiled_tpl === false) {
					var from_dom = $('#'+key);
					if (from_dom.length) {
						content = $('#'+key).text();
						compiled_tpl = Handlebars.compile(content);
						cache.store('cbb_template_'+key,compiled_tpl);
					} else {
						return false;
					}
				}
				return compiled_tpl;
			},
			addPartial: function(key, value) {
				Handlebars.registerPartial(key, value);
				return this;
			},
			add: function(key, value) {
				var compiled_tpl = Handlebars.compile(value);
				cache.store('cbb_template_'+key, compiled_tpl);
				return this;
			},
			getCached: function(key) {
				return cache.load('cbb_template_'+key);
			},
			list: function() {
				return cache.list('cbb_template_');
			}
		}
	}(this,document);
	//$(function() {
	//	var $templatesInHtml = $('script[type="text/x-js-template"]');
	//	$templatesInHtml.each(function(i,obj) {
	//		var $obj = $(obj), key = $obj.attr('id'), tpl = $obj.text();
	//		cbb.templates.add(key, tpl);
	//		$obj.remove();
	//	});
	//});
