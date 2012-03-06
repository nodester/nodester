$(function() {

	$('#reqbutton').click(function() {
		$('#reqform').toggle(200, function() {});
	});
	$('#regbutton').click(function() {
		$('#regform').toggle(200, function() {});
	});

	$('#videobutton').click(function() {
		// window.location.href = 'http://www.youtube.com/watch?v=jwsP1Ejv-_w';
		$.fancybox({
			'padding'		: 0,
			'autoScale'		: false,
			'transitionIn'	: 'elastic',
			'transitionOut'	: 'none',
			'title'			: this.title,
			'width'			: 680,
			'height'		: 495,
			'href'			: 'http://www.youtube.com/watch?v=jwsP1Ejv-_w&hd=1&feature=player_embedded#at=41'.replace(new RegExp("watch\\?v=", "i"), 'v/'),
			'type'			: 'swf',
			'swf'				: {
				'wmode'						: 'transparent',
				'allowfullscreen'	: 'true'
			}
		});
	});

	  var hash = window.location.hash.substring(1);
		if (hash == "faq") {
			$('#faqli').addClass("active");
			$('#helpli').removeClass("active");
			$('#help').removeClass("active");
			$('#faq').addClass("active");
		}
		if (hash == "rest") {
			$('#clili').removeClass("active");
			$('#cli').removeClass("active");
			$('#restli').addClass("active");
			$('#rest').addClass("active");
		}
		if (hash == "explorer") {
			$('#clili').removeClass("active");
			$('#cli').removeClass("active");
			$('#explorerli').addClass("active");
			$('#explorer').addClass("active");
		}

});