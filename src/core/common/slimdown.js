/**
 * Javascript version of https://gist.github.com/jbroadway/2836900
 *
 * Slimdown - A very basic regex-based Markdown parser. Supports the
 * following elements (and can be extended via Slimdown::add_rule()):
 *
 * - Headers
 * - Links
 * - Bold
 * - Emphasis
 * - Deletions
 * - Quotes
 * - Inline code
 * - Blockquotes
 * - Ordered/unordered lists
 * - Horizontal rules
 *
 * Author: Johnny Broadway <johnny@johnnybroadway.com>
 * Website: https://gist.github.com/jbroadway/2836900
 * License: MIT
 *
 * @global
 * @name  Slimdown
 */
var Slimdown = function () {
	// Rules
	this.rules = [
		{ regex: /(#{1,6})\s(.*)/g, replacement: header }, // headers
		{ regex: /!\[([^\[]+)\]\(([^\)]+)\)/g, replacement: "<img src='$2' alt='$1'>" }, // image
		{ regex: /\[([^\[]+)\]\(([^\)]+)\)/g, replacement: "<a href='$2'>$1</a>" }, // hyperlink
		{ regex: /(\*\*|__)(.*?)\1/g, replacement: '<strong>$2</strong>' }, // bold
		{ regex: /(\*|_)(.*?)\1/g, replacement: '<em>$2</em>' }, // emphasis
		{ regex: /\~\~(.*?)\~\~/g, replacement: '<del>$1</del>' }, // del
		{ regex: /\:\"(.*?)\"\:/g, replacement: '<q>$1</q>' }, // quote
		{ regex: /`(.*?)`/g, replacement: '<code>$1</code>' }, // inline code
		{ regex: /\n\*(.*)/g, replacement: ulList }, // ul lists
		{ regex: /\n[0-9]+\.\s(.*)/g, replacement: olList }, // ol lists
		{ regex: /\n(&gt;|\>)(.*)/g, replacement: blockquote }, // blockquotes
		{ regex: /\n-{5,}/g, replacement: '\n<hr />' }, // horizontal rule
		{ regex: /<\/ul>\s?<ul>/g, replacement: '' }, // fix extra ul
		{ regex: /<\/ol>\s?<ol>/g, replacement: '' }, // fix extra ol
		{ regex: /(?:[^\n]|(?:<[^>].*>)\n(?! *\n))+/g, replacement: para }, // add paragraphs
		{ regex: /<\/blockquote><blockquote>/g, replacement: '\n' }, // fix extra blockquote
	];

	//(\w+)\n

	// Add a rule.
	this.addRule = function (regex, replacement) {
		regex.global = true;
		regex.multiline = false;
		this.rules.push({ regex: regex, replacement: replacement });
	};

	// Render some Markdown into HTML.
	this.render = function (text) {
		text = '\n' + text + '\n';

		text = autolink(text);

		this.rules.forEach(function (rule) {
			text = text.replace(rule.regex, rule.replacement);
		});
		return text.trim();
	};

	function para(text, line) {
		var trimmed = ('' + text).trim();
		if (/^<\/?(ul|ol|li|h|p|bl)/i.test(trimmed)) {
			return trimmed;
		}

		trimmed = trimmed.replace(/\n/g, '<br />');

		return '<p>' + trimmed + '</p>';
	}

	function ulList(text, item) {
		return '\n<ul>\n\t<li>' + item.trim() + '</li>\n</ul>';
	}

	function olList(text, item) {
		return '\n<ol>\n\t<li>' + item.trim() + '</li>\n</ol>';
	}

	function blockquote(text, tmp, item) {
		return '\n<blockquote>' + item.trim() + '</blockquote>';
	}

	function header(text, chars, content) {
		var level = chars.length;
		return '<h' + level + '>' + content.trim() + '</h' + level + '>';
	}

	function autolink(text) {
		var urls = text.match(
			/(\(?https?:\/\/[-A-Za-z0-9+&@#\/%?=~_()|!:,.;]*[-A-Za-z0-9+&@#\/%=~_()|])(">|<\/a>|\)|\])?/gm
		);

		if (urls == null) return text;

		var cleanedUrls = {};
		for (var i = 0; i < urls.length; i++) {
			var url = urls[i];

			// ignore urls that are part of a markdown link already
			if (url.lastIndexOf(']') != -1 || url.lastIndexOf(')') != -1) break;

			// already replaced this url
			if (cleanedUrls[url]) break;

			cleanedUrls[url] = url;

			text = text.replace(url, '[' + url + '](' + url + ')');
		}

		return text;
	}
};

window.Slimdown = Slimdown;
export default Slimdown;
