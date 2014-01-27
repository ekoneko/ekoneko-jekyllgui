(function() {
	var fs = require('fs'),
	gui = require('nw.gui'),
	when = require('when'),
	path = require('path');

	$(function() {
		var setting;

		var getSetting = function() {
			var data = null;
			var deferred = when.defer();
			fs.exists('data/setting.json', function(exists) {
				if(exists) {
					data = fs.readFileSync('./data/setting.json');
					if (data) {
						data = JSON.parse(data);
					}
				}
				deferred.resolve(data); 
			});
			return deferred.promise;
		};

		var setSetting = function(data) {
			var deferred = when.defer();
			var setting = {
				configPath: data.configpath,
				envPath: data.envpath
			};
			fs.writeFile('data/setting.json', JSON.stringify(setting), {
				flag: 'w'
			}, function(err) {
				if (err) {
					return deferred.reject(err);
				}
				deferred.resolve(setting);
			});
			return deferred.promise;
		};

		var jekyllBuild = function() {
			var deferred = when.defer();
			var exec = require('child_process').exec;
			exec("jekyll build", {
				cwd: setting.configPath,
				env: {
					"PATH": process.env.PATH + ":" + setting.envPath
				}
			}, function(err, out) {
				if (err) {
					return deferred.reject(err);
				}
				deferred.resolve();
			});
			return deferred.promise;
		}

		var getList = function(callback) {
			var deferred = when.defer();
			return deferred.promise;
		};

		var writePost = function(data) {
			var content, postPath, date, fileName;
			var deferred = when.defer();
			content = "---\n";
			content = "layout: post\n"
			for (var i in data) {
				if (i === 'content') continue;
				if (i === 'uri') continue;
				content += (i + " : " + data[i] + "\n");
			}
			content += "---\n\n";
			content += data.content;

			date = new Date(data.date);
			fileName = getTimeString() + '-' + data.uri + '.markdown';
			postPath = path.resolve(setting.configPath, '_posts');
			fs.writeFile(path.resolve(postPath, fileName), content, {
				flag: 'w'
			}, function(err) {
				if (err) {
					return deferred.reject(err);
				}
				return deferred.resolve();
			});
			return deferred.promise;
		};

		var allowWritting = function() {
			$('#write').removeClass('disabled');
		};

		var disabledWritting = function() {
			$('#write').addClass('disabled');
		}

		var getTimeString = function() {
			var d = new Date();
			var month = d.getMonth() + 1;
			if (month < 10) {
				month = '0' + month;
			}
			return [
				d.getFullYear(),
				month,
				d.getDate()
			].join('-')
		}

		var load = function(action) {
			var container;
			var deferred = when.defer();
			fs.exists('resource/html/' + action + '.html', function(exists) {
				if (!exists) {
					return deferred.reject(new Error('html is not found'));
				}
				fs.readFile('resource/html/' + action + '.html', {}, function(err, html) {
					html = html.toString();
					container = $('#container').html(html);
					deferred.resolve(container); 
				});
			});
			return deferred.promise;
		};

		var tips = function(message, type, time) {
			var tips = $('#tips');
			type = type || 'error';
			time = Number(time) || 2000;
			tips.removeClass().addClass('tips-' + type);
			tips.html(message);
			setTimeout(function() {
				tips.fadeOut();
			}, time);
			tips.fadeIn();
		};

		var initPostForm = function() {
			var markdown = require('markdown').markdown;
			var editor = $('#editor');
			var preview = $('#preview');
			var previewDelay = 0;
			var renderPreview = function() {
				var text, html;
				text = editor.val();
				html = markdown.toHTML(text);
				preview.html(html);
			};
			editor.bind('keyup', function() {
				if (previewDelay) {
					clearTimeout(previewDelay);
				}
				previewDelay = setTimeout(function() {
					renderPreview();
				}, 1000);
			});
		};

		// construct
		getSetting().then(function(data) {
			setting = data;
			if (setting && setting.configPath) {
				allowWritting();
			}
			gui.Window.get().show();
		}).otherwise(function(err) {
			tips(err.message, 'error');
		});
		/* write */
		$('#write').bind('click', function() {
			load('write').then(function(container) {
				/* init */
				container.find('legend').bind('click', function() {
					var fieldset = $(this).parent();
					fieldset.hasClass('hide')
						? fieldset.removeClass('hide')
						: fieldset.addClass('hide')
				});
				container.find('[name="date"]').val(getTimeString());
				container.find('#editor-nav > span').bind('click', function() {
					var $this = $(this);
					var panel = $(this).parent();
					var old;
					if ($this.hasClass('current')) {
						return;
					}
					old = panel.children('.current').removeClass('current');
					$this.addClass('current');
					$('#' + old.attr('data-for')).removeClass('show').addClass('hide');
					$('#' + $this.attr('data-for')).addClass('show').removeClass('hide');
				});
				// init post form
				initPostForm();
				/* submit */
				var submiting = false;
				container.find('form').bind('submit', function() {
					var form = $(this);
					submiting = true;
					writePost(form.serializeObject()).then(function() {
						submiting = false;
					}).then(function() {
						jekyllBuild();
					}).then(function() {
						tips('发布成功', 'success');
					}).otherwise(function(err) {
						tips(err.message, 'error');
						submiting = false;
					});
					return false;
				});
			});
		});
		/* setting */
		$('#setting').bind('click', function() {
			load('setting').then(function(container) {
				/* init */
				container.find('#configpath').val(setting.configPath);
				container.find('#envpath').val(setting.envPath);

				/* submit */
				container.find('form').bind('submit', function() {
					var form = $(this);
					var data = form.serializeObject();
					if (!data.configpath) {
						tips('未填写地址', 'error');
						return false;
					}
					setSetting(data).then(function() {
						setting = {
							configPath: data.configpath,
							envPath: data.envpath
						};
						if (setting && setting.configPath) {
							allowWritting();
							tips('保存成功', 'success');
						}
					}).otherwise(function(err) {
						tips(err.message, 'error');
						submiting = false;
					});
					return false;
				});
			});
		})
		$('#menu').children(':first').trigger('click');
	});
})();