    cbb.Model = Backbone.Model.extend({
        fetch: function(options) {
            options || (options = {});
            var self = this,
                    success = options.success;
            self.trigger('fetching');
            options.success = function(resp) {
                if (success) { success(self, resp); }
                self.trigger('fetched');
            };
            Backbone.Model.prototype.fetch.call(self, options);
        }
    });
    cbb.Router = Backbone.Router.extend({
        parseData: function() {
            if (window.location && window.location.search) {
                var rawMeat = window.location.search.substr(1).split('&'),
                p = _(rawMeat)
                .chain()
                .select(function(v){ return v.match(/^data/); })
                .map(function(x){
                    var t = x.substr(4), s = t.split('='), v = s[1], k = s[0].replace(/\]\[/g,' ').replace(/\[|\]/g,'').split(' ');
                    return {key:k, val:v};
                })
                .reduce(function(memo,x) {
                    var c = x.key.length, b = false;
                    for (var y=0;y<c;y++) {
                        if (!b && !memo[x.key[y]]) {
                            memo[x.key[y]] = y<c-1 ? {} : x.val;
                            b = memo[x.key[y]];
                        } else if (!b[x.key[y]]) {
                            b[x.key[y]] = y<c-1 ? {} : x.val;
                            b = b[x.key[y]];
                        } else {
                            if (y == c-1) { b[x.key[y]] = x.val; }
                            b = b[x.key[y]];
                        }
                    }
                    return memo;
                }, {})
                .value();
                return p;
            } else { return false; }
        },
        templates: cbb.templates,
        render: function(template,data) {this.view.render(this.templates.compile(template),data);}
    });
    cbb.Collection = Backbone.Collection.extend({
        initialize: function(options) {
            var self = this;
            if (options) {
                if (options.page !== undefined && options.page != 0) {
                    this.page = options.page;
                }
                if (options.params && typeof options.params == 'object') {
                    this.params = options.params;
                }
                if (options.modelName !== undefined) {
                    this.modelName = options.modelName;
                }
                if (options.watch !== undefined) {
                    var wItem = options.watch.parent,
                        wEvent = options.watch.event;
                    wItem.bind(wEvent, self.fetch, self);
                }
            }
        },
        comparator: function(model) {
            var created = model.get('created');
            return created ? created.replace(/\D/g,'') * -1 : 0;
        },
        fetch: function(options) {
            options || (options = {});
            var self = this,
                    success = options.success;
            self.trigger('fetching');
            options.success = function(resp) {
                if (success) { success(self, resp); }
                self.trigger('fetched');
            };
            Backbone.Collection.prototype.fetch.call(self, options);
        },
        parse: function(resp) {
            if (resp.page != undefined && resp.per_page != undefined && resp.total != undefined) {
                this.page = resp.page;
                this.perPage = resp.per_page;
                this.total = resp.total;
                return resp.models
            } else {
                return resp;
            }
        },
        fresh: function() {
            delete this.perPage;
            delete this.total;
            this._reset();
            this.page = 1;
            return this;
        },
        url: function() {
            var base = '', params = this.page ? '?' + $.param(_.extend(this.params||{},{page: this.page})) : '';
            if (this.baseUrl) {
                base = typeof this.baseUrl == 'function' ? this.baseUrl() : this.baseUrl;
            } else if (this.name) {
                base = '/' + this.name;
            }
            return base + params;
        },
        pageInfo: function() {
            if (this.page && this.perPage && this.total) {
                var info = {
                    total: this.total,
                    page: this.page,
                    perPage: this.perPage,
                    pages: Math.ceil(this.total / this.perPage),
                    prev: false,
                    next: false
                };
                var max = Math.min(this.total, this.page * this.perPage);
                if (this.total == this.pages * this.perPage) {
                    max = this.total;
                }
                info.range = [(this.page - 1) * this.perPage + 1, max];
                if (this.page > 1) {
                    info.prev = this.page - 1;
                }
                if (this.page < info.pages) {
                    info.next = this.page + 1;
                }
                return info;
            } else {
                return undefined;
            }
        },
        nextPage: function() {
            if (this.page && this.pageInfo().next) {
                this.page = this.page + 1;
                this.fetch();
                return this;
            } else {
                return false;
            }
        },
        previousPage: function() {
            if (this.page && this.pageInfo().prev) {
                this.page = this.page - 1;
                this.fetch();
                return this;
            } else {
                return false;
            }
        }
    });
    cbb.View = Backbone.View.extend({
        initialize: function(options) {
            if (options) {
                if (options.router !== undefined) {this.router = options.router; delete options.router; }
                if (options.model !== undefined) { this.model = options.model; delete options.model; }
                if (options.widgets !== undefined) { this.widgets = options.widgets; delete options.widgets; }
                if (options.itemWidgets !== undefined) { this.itemWidgets = options.itemWidgets; delete options.itemWidgets; }
                if (options.modelName !== undefined) { this.modelName = options.modelName; delete options.modelName; }
                if (options.itemTagName !== undefined) { this.itemTagName = options.itemTagName; delete options.itemTagName; }
                if (options.extras !== undefined) { this.extras = options.extras; delete options.extras; }
                if (options.parentModel !== undefined) { this.parentModel = options.parentModel; delete options.parentModel; }
                if (options.gotoViewOnAdd !== undefined) {
                    this.gotoViewOnAdd = options.gotoViewOnAdd;
                    delete options.gotoViewOnAdd;
                }
                if (options.hideFormOnSubmit !== undefined) {
                    this.hideFormOnSubmit = options.hideFormOnSubmit;
                    delete options.hideFormOnSubmit;
                }
                if (options.showButtons !== undefined) {
                    this.showButtons = options.showButtons;
                    delete options.showButtons;
                }
            }
        },
        widgets: {
            // 'plugin selector': []
        },
        templates: cbb.templates,
        commonWidgets: function($rootElement) {
            $rootElement.find('ul.tab_hooks').duxTab();
            for (widget in this.widgets) {
                var eventSplitter = /^(\w+)\s*(.*)$/,
                    match = widget.match(eventSplitter),
                    $selector = $(match[2],$rootElement.get()),
                    method = match[1],
                    params = this.widgets[widget],
                    _params = [],
                    $backboneEl = $(this.el),
                    id,
                    title;
    
                if (this.tagName !== undefined && this.model && this.model.get) {
                    id = this.model.get('id') || Math.random();
                    title = this.model.get('title') || this.model.get('name') || 'unknown';
                } else {
                    id = Math.random();
                    title = 'unknown';
                }
    
                for (p in params) {
                    _params[p] = _.clone(params[p]);
                }
    
                for (a in _params) {
                    for (b in _params[a]) {
                        if (typeof _params[a][b] === 'string' && _params[a][b].match(/^cb_/)) {
                            var callback = _params[a][b].substr(3);
                            _params[a][b] = _.bind(this[callback],this);
                        }
                    }
                    _params[a].$backboneEl = $backboneEl;
                    _params[a].id = id;
                    _params[a].title = title;
                }
    
                if (_params !== undefined) {
                    $selector[method].apply($selector, _params);
                } else {
                    $selector[method]();
                }
            }
        },
        render: function(template,data) {
            var $thisel = typeof this.el == 'function' ? $(this.el()) : $(this.el);
            if ($thisel.length > 0) {
                $thisel.html(template(data));
                this.commonWidgets($thisel);
            }
            return this;
        },
        redirect: function(url) {
            this.router.navigate(url);
        },
        add: function(e) {
            e.preventDefault();
            var $target = $(e.target),
                target = e.target,
                collection = this.collection,
                $inputs = $('input,textarea,select',e.target).not('input[type=submit]'),
                inputSplitter = /^((\w+)\.)?(\w+)$/,
                gotoViewOnAdd = this.gotoViewOnAdd,
                hideFormOnSubmit = this.hideFormOnSubmit,
                thisview = this,
                model = {};

            $inputs.each(function(i){
                var value = $(this).val(),
                    match = $(this).attr('name').match(inputSplitter),
                    mField = match[2],
                    field = match[3];
                if (mField !== undefined) {
                    model[mField] || (model[mField] = {})
                    model[mField][field] = value;
                } else {
                    model[field] = value;
                }
            });

            var newModel = new this.collection.model(model);

            newModel.save(null,{
                success: function(model, response){
                    collection.add([model]);
                    $target.removeClass('ajax-error');
                    target.reset();
                    if (gotoViewOnAdd) {
                        thisview.redirect(collection.name + '/view/' + model.get('id'));
                    }
                    if (hideFormOnSubmit) {
                        $target.fadeOut('fast');
                    }
                    if (this.parentModel && this.parentModel.trigger) {
                        this.parentModel.trigger('childAdd');
                    }
                },
                error: function(model, response) {
                    $target.addClass('ajax-error');
                }
            });
    
        },
        update: function(el,callbacks) {
            var saveSet = {},
                model = this.model,
                $el = $(el),
                multiEdit = el.nodeName == 'DIV',
                hasValueData = $el.attr('data-field-data') !== undefined,
                field = $el.data('field'),
                value,
                r = {success: false,ret: false};
    
            if (multiEdit) {
                value = $el.html();
            } else {
                if (hasValueData) {
                    value = $el.attr('data-field-data');
                } else {
                    value = $el.text();
                }
            }
    
            model.attributes[field] = value;
            model._changed = true;
            model.save(saveSet, {
                silent: true,
                success: function(model, resp) {
                    callbacks.success();
                    model.trigger('change');
                },
                error: callbacks.error
            });
            
            return r.success;
        },
        next: function() {
            this.collection.nextPage();
            return false;
        },
        prev: function() {
            this.collection.previousPage();
            return false;
        }
    });
    cbb.PageView = cbb.View.extend({
        initialize: function(options) {
            cbb.View.prototype.initialize.call(this,options);
            if (options) {
                if (options.context) {
                    this.context = options.context;
                }
                if (options.viewTemplate !== undefined) {
                    if (typeof options.viewTemplate === 'string') {
                        this.viewTemplate = this.templates.compile(options.viewTemplate);
                    } else {
                        this.viewTemplate = options.viewTemplate;
                    }
                }
                if (options.events) {
                    this.events || ( this.events = {} );
                    _(this.events).extend(options.events);
                    delete options.events;
                    this.delegateEvents();
                }
            }
            this.bind('rendered',this.afterRender,this);
        },
        render: function() {
            var $thisEl = $(this.el),
                data = {};
            if (this.context === 'model' && this.model !== undefined) {
                data = this.model.toJSON();
            } else if (this.context === 'collection' && this.collection !== undefined) {

                data[this.collection.modelName] = this.collection.toJSON(); 
            } else {
                data = (this.context && this[this.context]) ? this[this.context].toJSON() : {};
            }
            $thisEl.html(this.viewTemplate(data));
            this.commonWidgets($thisEl);
            this.trigger('rendered');
            $thisEl.trigger('rendered');
            return this;
        },
        rendering: function() {
            $(this.el).fadeTo(0.5,0.5);
            return this;
        },
        filterBy: function(e) {
            var filter = $(e.target).text();
            this.collection.params.filter = filter;
            this.collection.fetch();
        },
        afterRender: function() {
            $(this.el).fadeTo(0.5,1);
            return this;
        }
    });
    cbb.ListView = cbb.View.extend({
        modelName: undefined,
        itemTagName: 'li',
        gotoViewOnAdd: false,
        showButtons: true,
        hideFormOnSubmit: true,
        initialize: function(options) {
            var self = this;
            cbb.View.prototype.initialize.call(self, options);
            $(self.el).addClass('paginated');
            self.collection
                .bind('add', self.redrawItems, self)
                .bind('fetched', self.redrawItems ,self)
                .bind('fetching', self.fetchingItems, self);
            if (options) {
                if (options.events !== undefined) {
                    this.events || ( this.events = {} );
                    _(this.events).extend(options.events);
                    delete options.events;
                }
            }
            this.commonWidgets($(this.el));
        },
        events: {
            'click .next': 'next',
            'click .prev': 'prev',
            'click .p_form a[data-type="add"]': 'renderAddForm',
            'submit form[action*="add"]': 'add'
        },
        fetchingItems: function() {
            $(this.el).fadeTo(0.5,0.5);
        },
        renderAddForm: function(e) {
            e.preventDefault();
            var $thisEl = $(this.el),
                formTemplate = this.templates.compile(this.modelName.toLowerCase() + 'ItemAdd'),
                //data = this._extendDataWithExtras({ customer_id: this.collection.params.customer_id }),
                data = {
                    customer_id: this.collection.params.customer_id
                },
                $pForm = $thisEl.find('.p_form'),
                $form = $(formTemplate(data)).insertBefore($pForm.get(0));
    
            this.commonWidgets($form);
            for (i in this.extras) {
                var extra = this.extras[i],
                    extraView = new cbb.MiniListView({
                        collection: extra.collection,
                        findEl: extra.config.findEl,
                        keyName: extra.config.keyName,
                        modelFieldName: extra.config.modelFieldName,
                        parentModel: this.parentModel,
                        parentView: this,
                        $parentViewEl: $thisEl,
                        valueName: extra.config.valueName
                    });
                extraView.render();
            }
            $pForm.fadeOut('fast');
        },
        _extendDataWithExtras: function(data) {
            if (this.extras !== undefined) {
                if (this.extras.users !== undefined) {
                    data.users = this.extras.users.toJSON();
                }
                if (this.extras.websites !== undefined) {
                    data.websites = this.extras.websites.toJSON();
                }
                if (this.extras.services !== undefined) {
                    data.services = this.extras.services.toJSON();
                }
            }
            return data;
        },
        redrawItems: function() {
            var paginationTemplate = this.templates.compile('pagination'),
                buttonTemplate = this.templates.compile(this.modelName.toLowerCase() + 'Buttons'),
                $thisEl = $(this.el);
            this.$('article, .pagelinks, .emptycollection, ul[data-icontainer], .p_form').remove();
            this.$('.loading').fadeOut('fast').remove();
            if (this.collection.models.length > 0) {
                $thisEl.removeClass('empty');
                if (this.itemTagName === 'li') {
                    $itemContainer = $thisEl.find('ul[data-icontainer]');
                    if ($itemContainer.length === 0) {
                        $itemContainer = $('<ul data-icontainer="1" class="mini list"></ul>').appendTo(this.el);
                    }
                }
                for (i in this.collection.models) {
                    var model = this.collection.models[i],
                        itemView = new cbb.ItemView({
                            tagName: this.itemTagName,
                            viewTemplate: this.modelName.toLowerCase() + 'ItemView',
                            widgets: this.itemWidgets,
                            model: model
                        });
    
                    if (this.itemTagName === 'li') {
                        $itemContainer.append(itemView.render().el);
                    } else {
                        $thisEl.append(itemView.render().el);
                    }
                    if (this.extras !== undefined && typeof this.extras === 'object') {
                        for (i in this.extras) {
                            var extra = this.extras[i],
                                config = extra.config,
                                miniListView = new cbb.MiniListView({
                                    collection: extra.collection,
                                    findEl: config.findEl,
                                    keyName: config.keyName,
                                    modelFieldName: config.modelFieldName,
                                    parentModel: model,
                                    parentView: itemView,
                                    $parentViewEl: itemView.el,
                                    valueName: config.valueName
                                });
                        }
                    }
                    $(itemView.el).trigger('rendered');
                    this.bind('rendered', function() {
                        this.trigger('rendered');
                    }, itemView);
                }
                $thisEl.append(paginationTemplate({
                    model: this.modelName,
                    pageInfo: this.collection.pageInfo()
                }));
            } else {
                $thisEl.addClass('empty');
                $thisEl.append(this.templates.compile('emptyCollection')({
                    modelName: this.modelName
                }));
            }
            if (this.showButtons) {
                $thisEl.append(buttonTemplate());
            }
            this.trigger('rendered');
            $thisEl.fadeTo(0.5,1);
        }
    });
    cbb.MiniListView = cbb.View.extend({
        initialize: function(options) {
            cbb.View.prototype.initialize.call(this, options);
            if (options !== undefined) {
                if (options.allowEmpty !== undefined) {
                    this.allowEmpty = options.allowEmpty;
                    delete options.allowEmpty;
                }
                if (options.findEl !== undefined) {
                    this.findEl = options.findEl;
                    delete options.findEl;
                }
                if (options.$parentViewEl !== undefined) {
                    this.$parentViewEl = options.$parentViewEl;
                    delete options.$parentViewEl;
                }
                if (options.parentView) {
                    this.parentView = options.parentView;
                    delete options.parentView;
                }
                if (options.keyName !== undefined) {
                    this.keyName = options.keyName;
                    delete options.keyName;
                }
                if (options.valueName !== undefined) {
                    this.valueName = options.valueName;
                    delete options.valueName;
                }
                if (options.modelFieldName !== undefined) {
                    this.modelFieldName = options.modelFieldName;
                    delete options.modelFieldName;
                }
            }
            this.collection
                .bind('fetched', this.render, this);
            this.parentView
                .bind('rendered', this.render, this);
        },
        tagName: 'option',
        render: function() {
            var self = this,
                $thisEl = $(this.findEl,this.$parentViewEl),
                data = this.allowEmpty === true ? '<option value=""></option>' : '';
            this.collection.forEach(function(model){
                data += '<' + self.tagName + ' value="' + model.get(self.keyName) + '">' + model.get(self.valueName) + '</' + self.tagName + '>';
            });
            $thisEl.html(data);
            if (this.parentModel !== undefined) {
                $thisEl.val(this.parentModel.get(this.modelFieldName));
            }
        }
    });
    cbb.ItemView = cbb.View.extend({
        modelName: undefined,
        tagName: 'li',
        initialize: function(options) {
            cbb.View.prototype.initialize.call(this, options);
            if (options !== undefined) {
                if (options.viewTemplate && typeof options.viewTemplate == 'string') {
                    this.viewTemplate = this.templates.compile(options.viewTemplate);
                }
            }
        },
        render: function() {
            var $thisel = $(this.el);
            $thisel.html(this.viewTemplate(this.model.toJSON()));
            this.commonWidgets($thisel);
            return this;
        }
    });
