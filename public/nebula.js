//////////////////////////////////////////////////////////////////////////////////
// A demonstration of a Canvas nebula effect
// (c) 2010 by R Cecco. <http://www.professorcloud.com>
// MIT License
//
// Please retain this copyright header in all versions of the software if
// using significant parts of it
//////////////////////////////////////////////////////////////////////////////////
// Modified by Adam Malcontenti-Wilson

(function() {
    // Request Animation Frame shim
    // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    var requestAnimationFrame = (function(){
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    || 
              window.oRequestAnimationFrame      || 
              window.msRequestAnimationFrame     || 
              function( callback ){
                window.setTimeout(callback, 1000 / 60);
              };
    })();
    
    // Create canvases
    var canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d'),
        canvas2 = document.createElement('canvas'),
        ctx2 = canvas2.getContext('2d'),
        canvas3 = document.createElement('canvas'),
        ctx3 = canvas3.getContext('2d');
    
    var w = canvas.width = 285;
    var h = canvas.height = 285;
    canvas2.id = "nebula";
    canvas2.width = canvas2.height = 570;
    canvas3.width = canvas3.height = 570;
    
    // A puff.
    var	Puff = function(p) {				
		var	opacity,
			sy = (Math.random()*285)>>0,
			sx = (Math.random()*285)>>0;
		
		this.p = p;
				
		this.move = function(timeFac) {						
			p = this.p + 0.3 * timeFac;				
			opacity = (Math.sin(p*0.05)*0.5);						
			if(opacity <0) {
				p = opacity = 0;
				sy = (Math.random()*285)>>0;
				sx = (Math.random()*285)>>0;
			}												
			this.p = p;																			
			ctx.globalAlpha = opacity;						
			ctx.drawImage(canvas3, sy+p, sy+p, 285-(p*2),285-(p*2), 0,0, w, h);								
		};
	};

    var	puffs = [];			
	var	sortPuff = function(p1,p2) { return p1.p-p2.p; };	
	puffs.push( new Puff(0) );
	puffs.push( new Puff(20) );
	puffs.push( new Puff(40) );
			
	var	newTime, oldTime = 0, timeFac;

    var	animate = function()
	{								
		newTime = new Date().getTime();				
		if(oldTime === 0 ) {
			oldTime=newTime;
		}
		timeFac = (newTime-oldTime) * 0.1;
		if(timeFac>3) {timeFac=3;}
		oldTime = newTime;						
		puffs.sort(sortPuff);							
		
		for(var i=0;i<puffs.length;i++)
		{
			puffs[i].move(timeFac);	
		}					
		ctx2.drawImage( canvas ,0,0,570,570);				
		requestAnimationFrame( animate );			
	};
    
    // Load nebula image into canvas3
    var img = new Image();
    img.onload = function() {
        ctx3.drawImage(img, 0,0, 570, 570);
        animate();
        document.body.className += " nebula-ready";
    };
    img.src = 'http://nodester.com/images/nebula.jpg';
    
    document.body.appendChild(canvas2);
})();