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
        },
        initialize: function(attributes, options) {
            if (options !== undefined) {
                if (options.childOptions !== undefined) {
                    this.childOptions = options.childOptions;
                }
            }
            Backbone.Model.prototype.initialize.call(this, attributes, options);
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
        templates: cbb.templates
    });
    cbb.Collection = Backbone.Collection.extend({
        initialize: function(options) {
            var self = this;
            if (options) {
                if (options.page !== undefined && options.page != 0) {
                    this.page = options.page;
                }
                if (options.baseUrl !== undefined) {
                    this.baseUrl = options.baseUrl;
                    delete options.baseUrl;
                }
                if (options.params && typeof options.params == 'object') {
                    this.params = _.clone(options.params);
                }
                if (options.modelName !== undefined) {
                    this.modelName = options.modelName;
                }
                if (options.watcher !== undefined) {
                    if (_.isArray(options.watcher)) {
                        _(options.watcher).each(function(element, index, list) {
                            element[index].parent.on(element[index].event, this.fetch, this);
                            if (this.viewWatcherIsReady(element)) {
                                this.fetch();
                            }
                        }, this);
                    } else {
                        options.watcher.parent.on(options.watcher.event, this.fetch, this);
                        if (this.viewWatcherIsReady(options.watcher)) {
                            this.fetch();
                        }
                    }
                }
            }
        },
        viewWatcherIsReady: function(watcher) {
            var view = watcher.parent,
                boundEventIsReady = watcher.event + 'Ready';
            return view[boundEventIsReady] === true;
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
            options = options || {};
            this
                .extendEvents(options.events)
                .setExtras(options.extras)
                .setGotoViewOnAdd(options.gotoViewOnAdd)
                .setItemTagName(options.itemTagName)
                .setItemWidgets(options.itemWidgets)
                .setModel(options.model)
                .setModelName(options.modelName)
                .setShowButtons(options.showButtons)
                .setHideFormOnSubmit(options.hideFormOnSubmit)
                .setParentModel(options.parentModel)
                .setParentView(options.parentView)
                .setRouter(options.router)
                .setWidgets(options.widgets)
                .on('rendered', this.rendered, this)
                .on('rendering', this.rendering, this);
        },
        widgets: {},
        setExtras: function(extras) {
            if (!_.isUndefined(extras)) {
                this.extras = extras;
            }
            return this;
        },
        setGotoViewOnAdd: function(gotoViewOnAdd) {
            if (!_.isUndefined(gotoViewOnAdd)) {
                this.gotoViewOnAdd = gotoViewOnAdd;
            }
            return this;
        },
        setItemTagName: function(itemTagName) {
            if (!_.isUndefined(itemTagName)) {
                this.itemTagName = itemTagName;
            }
            return this;
        },
        setItemWidgets: function(itemWidgets) {
            this.itemWidgets = this.itemWidgets || {};
            if (!_.isUndefined(itemWidgets)) {
                _(this.itemWidgets).extend(itemWidgets);
            }
            return this;
        },
        setModel: function(model) {
            if (!_.isUndefined(model)) {
                this.model = model;
            }
            return this;
        },
        setModelName: function(modelName) {
            if (!_.isUndefined(modelName)) {
                this.modelName = modelName;
            }
            return this;
        },
        setShowButtons: function(showButtons) {
            if (!_.isUndefined(showButtons)) {
                this.showButtons = showButtons;
            }
            return this;
        },
        setHideFormOnSubmit: function(hideFormOnSubmit) {
            this.hideFormOnSubmit = false;
            if (!_.isUndefined(hideFormOnSubmit)) {
                this.hideFormOnSubmit = hideFormOnSubmit;
            }
            return this;
        },
        setParentModel: function(parentModel) {
            if (!_.isUndefined(parentModel)) {
                this.parentModel = parentModel;
            }
            return this;
        },
        setParentView: function(parentView) {
            if (!_.isUndefined(parentView)) {
                this.parentView = parentView;
                if (_.isFunction(this.redrawItems)) {
                    this.parentView.on('renderChildren', this.redrawItems, this);
                }
            }
            return this;
        },
        setRouter: function(router) {
            if (!_.isUndefined(router)) {
                this.router = router;
            }
            return this;
        },
        setWidgets: function(widgets) {
            if (!_.isUndefined(widgets)) {
                this.widgets = widgets;
            }
            return this;
        },
        extendEvents: function(events) {
            if (_.isObject(events)) {
                _(this.events).extend(events);
                this.delegateEvents();
            }
            return this;
        },
        compileViewTemplate: function(viewTemplate) {
            if (!_.isUndefined(viewTemplate)) {
                if (_.isString(viewTemplate)) {
                    this.viewTemplate = this.templates.compile(viewTemplate);
                } else {
                    this.viewTemplate = viewTemplate;
                }
            } else if (!_.isUndefined(this.viewTemplate)) {
                if (_.isString(this.viewTemplate)) {
                    this.viewTemplate = this.templates.compile(this.viewTemplate);
                }
            }
        },
        templates: cbb.templates,
        commonWidgets: function() {
            for (widget in this.widgets) {
                var eventSplitter = /^(\w+)\s*(.*)$/,
                    callbackTypes = ['save', 'success', 'error'],
                    match = widget.match(eventSplitter),
                    $selector = this.$(match[2]),
                    method = match[1],
                    params = _.clone(this.widgets[widget]),
                    id,
                    title;
    
                if (this.tagName !== undefined && this.model && this.model.get) {
                    id = this.model.get('id') || Math.random();
                    title = this.model.get('title') || this.model.get('name') || 'unknown';
                } else {
                    id = Math.random();
                    title = 'unknown';
                }

                _(params).each(function(callback, type) {
                    if (_(callbackTypes).include(type) && _.isString(callback)) {
                        params[type] = _.bind(this[callback], this);
                    }
                }, this);
                params.$backboneEl = this.$el;
                params.id = id;
                params.title = title;

                if (!_.isUndefined(params)) {
                    $selector[method].call($selector, params);
                } else {
                    $selector[method]();
                }
            }
            return this;
        },
        render: function(template,data) {
            var this$el = this.$el;
            if (this$el.length > 0) {
                this$el.html(template(data));
                this.commonWidgets();
            }
            return this;
        },
        redirect: function(url) {
            this.router.navigate(url, true);
        },
        add: function(e) {
            e.preventDefault();
            var $target = $(e.target),
                target = e.target,
                collection = this.collection,
                $inputs = $('input,textarea,select',e.target).not('input[type=submit]'),
                inputSplitter = /^((\w+)\.)?(\w+)$/,
                gotoViewOnAdd = this.gotoViewOnAdd,
                hideFormOnSubmit = this.hideFormOnSubmit === undefined ? true : this.hideFormOnSubmit,
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

            var newModel = new this.collection.model(model),
                thisModel = this;

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
                    if (thisModel.parentModel && thisModel.parentModel.trigger) {
                        thisModel.parentModel.trigger('childAdd');
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
        next: function(event) {
            event.preventDefault();
            this.collection.nextPage();
        },
        prev: function(event) {
            event.preventDefault();
            this.collection.previousPage();
        },
        rendering: function() {
            $(this.el).addClass('fading');
            this.renderChildrenReady = undefined;
            return this;
        },
        rendered: function() {
            $(this.el).removeClass('fading');
            this.trigger('renderChildren');
            this.renderChildrenReady = true;
            return this;
        }
    });
    cbb.PageView = cbb.View.extend({
        initialize: function(options) {
            cbb.View.prototype.initialize.call(this,options);
            this.compileViewTemplate(options.viewTemplate);
            if (options) {
                if (options.context) {
                    this.context = options.context;
                }
            }
            this.titleEl = document.getElementsByTagName('title')[0];
            this.on('set_title', this.setTitle, this)
                .on('reset', this.resetData, this)
                .on('reset', this.resetSubViews, this);
        },
        setTitle: function(title) {
            $(this.titleEl).text(title);
        },
        render: function() {
            var this$el = this.$el,
                data = {};
            if (this.context === 'model' && this.model !== undefined) {
                data = this.model.toJSON();
            } else if (this.context === 'collection' && this.collection !== undefined) {

                data[this.collection.modelName] = this.collection.toJSON(); 
            } else {
                data = (this.context && this[this.context]) ? this[this.context].toJSON() : {};
            }
            this$el.html(this.viewTemplate(data));
            this.commonWidgets()
                .trigger('rendered');
            this$el.trigger('rendered');
            return this;
        },
        filterBy: function(e) {
            var filter = $(e.target).text();
            this.collection.params.filter = filter;
            this.collection.fetch();
        },
        resetData: function() {
            if (this.model) {
                delete this.model;
            }
            if (this.collection) {
                delete this.collection;
            }
        },
        addSubView: function(name, viewClass) {
            this.views = this.views || {};
            this.views[name] = viewClass;
            return this;
        },
        resetSubViews: function() {
            this.views = {};
            return this;
        },
    });
    cbb.ListView = cbb.View.extend({
        modelName: undefined,
        itemTagName: 'li',
        gotoViewOnAdd: false,
        showButtons: true,
        hideFormOnSubmit: true,
        initialize: function(options) {
            cbb.View.prototype.initialize.call(this, options);
            options = options || {};
            this.collection
                .on('add', this.redrawItems, this)
                .on('reset', this.redrawItems, this)
                .on('fetched', this.redrawItems ,this)
                .on('fetching', this.fetchingItems, this);
            this.setItemListTemplateStem(options.itemListTemplateStem)
                .commonWidgets();
        },
        setItemListTemplateStem: function(templateStem) {
            if (!_.isUndefined(templateStem)) {
                this.itemListTemplateStem = templateStem;
            } else if (_.isUndefined(this.itemListTemplateStem)) {
                this.itemListTemplateStem = 'ItemView';
            }
            return this;
        },
        events: {
            'click .next': 'next',
            'click .prev': 'prev',
            'click .p_form a[data-type="add"]': 'renderAddForm',
            'submit form[action*="add"]': 'add'
        },
        fetchingItems: function() {
            this.$el.addClass('fading');
        },
        _parentModelSerialise: function () {
            return null;
        },
        renderAddForm: function(e) {
            e.preventDefault();
            var this$el = this.$el,
                formTemplate = this.templates.compile(this.modelName.toLowerCase() + 'ItemAdd'),
                data = {
                    customer_id: this.collection.params.customer_id,
                    parentModel: this._parentModelSerialise()
                },
                $pForm = this$el.find('.p_form'),
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
                        $parentViewEl: this$el,
                        valueName: extra.config.valueName
                    });
                extraView.render();
            }
            $pForm.fadeOut('fast');
        },
        redrawItems: function() {
            var paginationTemplate = this.templates.compile('pagination'),
                buttonTemplate = this.templates.compile(this.modelName.toLowerCase() + 'Buttons'),
                this$el = this.$el;
            this.$('article, .pagelinks, .emptycollection, ul[data-icontainer], .p_form').remove();
            this.$('.loading').fadeOut('fast').remove();
            if (this.collection.models.length > 0) {
                this$el.removeClass('empty');
                if (this.itemTagName === 'li') {
                    //$itemContainer = this$el.find('ul[data-icontainer]');
                    $itemContainer = this.$('ul[data-icontainer]');
                    if ($itemContainer.length === 0) {
                        $itemContainer = $('<ul data-icontainer="1" class="mini list"></ul>').appendTo(this.el);
                    }
                }

                for (i in this.collection.models) {
                    var model = this.collection.models[i],
                        itemView = new cbb.ItemView({
                            tagName: this.itemTagName,
                            viewTemplate: this.modelName.toLowerCase() + this.itemListTemplateStem,
                            widgets: this.itemWidgets,
                            model: model
                        });

                    if (this.itemTagName === 'li') {
                        $itemContainer.append(itemView.render().el);
                    } else {
                        this$el.append(itemView.render().el);
                    }
                    if (typeof this.extras === 'object') {
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
                    this.on('rendered', function() { this.trigger('rendered'); }, itemView);
                }
                this$el.append(paginationTemplate({
                    model: this.modelName,
                    pageInfo: this.collection.pageInfo()
                }));
            } else {
                this$el.addClass('empty');
                this$el.append(this.templates.compile('emptyCollection')({
                    modelName: this.modelName
                }));
            }
            if (this.showButtons) {
                this$el.append(buttonTemplate());
            }
            this.trigger('rendered');
            this$el.removeClass('fading');
        }
    });
    cbb.MiniListView = cbb.View.extend({
        initialize: function(options) {
            cbb.View.prototype.initialize.call(this, options);
            options = options || {};
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
            this.setElement(this.parentView.$(this.findEl).get(0));
            this.collection.on('fetched', this.render, this);
            this.parentView.on('rendered', this.render, this);
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
            this.compileViewTemplate(options.viewTemplate);
        },
        render: function() {
            this.$el.html(this.viewTemplate(this.model.toJSON()));
            this.commonWidgets()
                .trigger('rendered');
            return this;
        }
    });
