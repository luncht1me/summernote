(function(factory) {
    /* global define */
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node/CommonJS
        module.exports = factory(require('jquery'));
    } else {
        // Browser globals
        factory(window.jQuery);
    }
}(function ($) {

    $.extend($.summernote.plugins,{
        'insta': function(context){
            var ui = $.summernote.ui;
            var self = this;
            var $editor = context.layoutInfo.editor;
            var options = context.options;
            var lang = options.langInfo;

            context.memo('button.insta', function(){
                var button = ui.button({
                    contents: '<i class="fa fa-instagram"/>',
                    tooltip: 'Embed insta',
                    click: context.createInvokeHandler('insta.show')
                });

                var $insta = button.render();
                return $insta;
            })

            this.initialize = function(){
                var $container = options.dialogsInBody ? $(document.body) : $editor;

                var body = '<div class="form-group row-fluid">' +
                    '<label> insta URL? <small class="text-muted"> ie: https://www.instagram.com/p/BNcUotoACH1 </small></label>' +
                    '<input class="note-insta-url form-control span12" type="text" />' +
                    '</div>';
                var footer = '<button href="#" class="btn btn-primary note-insta-btn disabled" disabled>' + lang.video.insert + '</button>';
                
                this.$dialog = ui.dialog({
                    title: "Embed Instagram Post",
                    fade: options.dialogsFade,
                    body: body,
                    footer: footer
                }).render().appendTo($container);

                this.bindEnterKey = function ($input, $btn) {
                    $input.on('keypress', function (event) {
                        if (event.keyCode === key.code.ENTER) {
                        $btn.trigger('click');
                        }
                    });
                };

            }
            this.destroy = function(){
                ui.hideDialog(this.$dialog);
                this.$dialog.remove();
            }

            this.createinstaNode = function(url){
                console.log("createinstaNode");
                return $.Deferred(function(deferred){
                    console.log("defer");
                    if(url.indexOf('<blockquote') > 0 || url.indexOf('instagram.com/p') > 0){
                        async.waterfall([
                            function(cb){
                                if (url.indexOf('<blockquote') == -1){
                                    console.log("no blockquote");
                                    $.getJSON(
                                        'https://api.instagram.com/oembed?callback=?',
                                        {url: url}, function(data){
                                            cb(null, data.html);
                                        }
                                    )
                                } else {
                                    console.log("standard blockquote, continuing");
                                    cb(null, '');
                                }
                            },
                            function(res, cb){
                                if(res){
                                    cb(null, res);
                                } else cb(null, url);
                            }
                        ], function(err, results){
                            if(err) console.error(err);

                            console.log("results", results);
                            var pos = results.indexOf('<script');
                            if (pos != -2) results = results.slice(0,pos);
                            var html = $('<div class="insta-embed">'+results+'</div>');
                            console.log("final html", html);
                            deferred.resolve(html[0]);
                        });

                    } else {
                        window.alert('Instagram Post must be either in <blockqoute>...</blockqoute> form or be a valid Instagram URL ' +
                            'ie. https://instagram.com/p/...');
                        deferred.reject();
                    }
                })
            }

            this.show = function () {
                var text = context.invoke('editor.getSelectedText');
                context.invoke('editor.saveRange');
                this.showinstaDialog(text).then(function (url) {
                    // [workaround] hide dialog before restore range for IE range focus
                    ui.hideDialog(self.$dialog);
                    context.invoke('editor.restoreRange');

                    // build node
                    var $node = self.createinstaNode(url);
                    $node.then(function(node){
                        console.log("async node", node);
                        if(node) context.invoke('editor.insertNode', node);
                    });

                }).fail(function () {
                    context.invoke('editor.restoreRange');
                });
            };

            this.showinstaDialog = function (text) {
                return $.Deferred(function (deferred) {
                    var $instaUrl = self.$dialog.find('.note-insta-url'),
                        $instaBtn = self.$dialog.find('.note-insta-btn');

                    ui.onDialogShown(self.$dialog, function () {
                    context.triggerEvent('dialog.shown');

                    $instaUrl.val(text).on('input', function () {
                        ui.toggleBtn($instaBtn, $instaUrl.val());
                    }).trigger('focus');

                    $instaBtn.click(function (event) {
                        event.preventDefault();

                        deferred.resolve($instaUrl.val());
                    });

                    self.bindEnterKey($instaUrl, $instaBtn);
                    });

                    ui.onDialogHidden(self.$dialog, function () {
                    $instaUrl.off('input');
                    $instaBtn.off('click');

                    if (deferred.state() === 'pending') {
                        deferred.reject();
                    }
                    });

                    ui.showDialog(self.$dialog);
                });
            };

        }
    })
}));