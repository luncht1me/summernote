(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else {
        factory(window.jQuery);
    }

}(function ($) {
    var tmpl = $.summernote.renderer.getTemplate();
    //var editor = $.summernote.eventHandler.getEditor();

    // core functions: range, dom
    var range = $.summernote.core.range;
    var dom = $.summernote.core.dom;

    if (!Array.prototype.chunk) {
        Array.prototype.chunk = function (chunkSize) {
            var R = [];
            for (var i = 0; i < this.length; i += chunkSize)
                R.push(this.slice(i, i + chunkSize));
            return R;
        }
    }

    /*IE polyfill*/
    if (!Array.prototype.filter) {
        Array.prototype.filter = function (fun /*, thisp*/) {
            var len = this.length >>> 0;
            if (typeof fun != "function")
                throw new TypeError();

            var res = [];
            var thisp = arguments[1];
            for (var i = 0; i < len; i++) {
                if (i in this) {
                    var val = this[i];
                    if (fun.call(thisp, val, i, this))
                        res.push(val);
                }
            }
            return res;
        };
    }

    var getTextOnRange = function ($editable) {
        $editable.focus();

        var rng = range.create();

        // if range on anchor, expand range with anchor
        if (rng.isOnAnchor()) {
            var anchor = dom.ancestor(rng.sc, dom.isAnchor);
            rng = range.createFromNode(anchor);
        }

        return rng.toString();
    };

    var toggleBtn = function ($btn, isEnable) {
        $btn.toggleClass('disabled', !isEnable);
        $btn.attr('disabled', !isEnable);
    };


    var showTweetDialog = function ($editable, $dialog, text) {
        return $.Deferred(function (deferred) {
            var $tweetDialog = $dialog.find('.note-tweet-dialog');

            var $tweetUrl = $tweetDialog.find('.note-tweet-url'),
                $tweetBtn = $tweetDialog.find('.note-tweet-btn');

            $tweetDialog.one('shown.bs.modal', function () {
                $tweetUrl.val(text).on('input', function () {
                    toggleBtn($tweetBtn, $tweetUrl.val());
                }).trigger('focus');

                $tweetBtn.click(function (event) {
                    event.preventDefault();

                    deferred.resolve($tweetUrl.val());
                    $tweetDialog.modal('hide');
                });
            }).one('hidden.bs.modal', function () {
                $tweetUrl.off('input');
                $tweetBtn.off('click');

                if (deferred.state() === 'pending') {
                    deferred.reject();
                }
            }).modal('show');
        });
    };

    $.summernote.addPlugin({
        name: 'tweet',
        buttons: {
            tweet: function (options) {
                if(document.emojiSource === undefined)
                    document.emojiSource = '';
                return tmpl.iconButton('fa fa-twitter', {
                    event: 'showTweetDialog',
                    title: 'Embed Tweet',
                    hide: true
                });
            }
        },
        dialogs: {
            tweet: function () {
                var body = '<div class="form-group row-fluid">' +
                    '<label> Tweet URL <small class="text-muted"> (Insert from "Embed this Tweet" ' +
                    'or Tweet URL) </small></label>' +
                    '<input class="note-tweet-url form-control span12" type="text" />' +
                    '</div>';
                var footer = '<button href="#" class="btn btn-primary note-tweet-btn disabled" disabled> Insert </button>';
                return tmpl.dialog('note-tweet-dialog', 'Embed Tweet', body, footer);
            }
        },
        events: {
            showTweetDialog: function (event, editor, layoutInfo){
                var $dialog = layoutInfo.dialog(),
                    $editable = layoutInfo.editable(),
                    text = getTextOnRange($editable);

                editor.saveRange($editable);

                showTweetDialog($editable, $dialog, text).then(function (url) {
                    if(url.indexOf('<blockquote') > 0 || url.indexOf('twitter.com') > 0){
                        async.waterfall([
                            function(cb){
                                if (url.indexOf('<blockquote') == -1){
                                    console.log("no blockquote");
                                    $.getJSON(
                                        'https://api.twitter.com/1/statuses/oembed.json?callback=?',
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
                            var html = $('<twitter-widget>'+results+'</twitter-widget>');
                            console.log("final html", html);
                            editor.restoreRange($editable);
                            editor.pasteHTML($editable, html);
                        });

                    } else {
                        window.alert('Tweet must be either in <blockqoute>...</blockqoute> form or be a tweet URL ' +
                            'ie. https://twitter.com/.../status/...');
                    }

                })
            }
        }
    });
}));