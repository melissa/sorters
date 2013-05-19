var SIMSchedulers = function(){};

if (Function.prototype.bind === undefined) {
    /*alert("There is a known issue in which Safari on a mobile Apple device 
    	does not support this page. I am working on finding a solution. In 
    	the meantime, please try using a different browser or a desktop machine. Sorry!");*/

    // from stackoverflow--for older browsers without bind()
    Function.prototype.bind = function(bind) {
	var self = this;
	return function() {
            var args = Array.prototype.slice.call(arguments);
            return self.apply(bind || null, args);
	};
    };
}

// function to get things started
SIMSchedulers.go = function() {
    var canvases=document.getElementsByTagName("canvas");
    for (var i=0; i<canvases.length; i++) {
	//if (canvases[i].dataset.program === "schedulers") new SIMSchedulers.SchedulerCanvas(canvases[i]);
	if (canvases[i].getAttribute("data-program") === "schedulers") new SIMSchedulers.SchedulerCanvas(canvases[i]); // IE-compatible line
    }
}

////////////////////////////////////////////////////////////////////////////////
// CANVAS OBJECT
////////////////////////////////////////////////////////////////////////////////

SIMSchedulers.SchedulerCanvas = function(canvas) {

    ////////////////////////////////////////
    // SETUP STUFF
    ////////////////////////////////////////

    // pseudo-constructor (called at the end)
    this.init = function(canvas) {
	this.canvas = canvas;
	this.context = canvas.getContext('2d');
	this.context.font = "15px sans-serif";
	this.buttonThreshold = canvas.height;

	// constants to set
	this.schedulers = this.makeSchedulers();

	
	// this.shuffleSchedulers();
	this.buttons = this.makeButtons();
	this.dirtyBit = false;
	this.isPlaying = false;
	this.tableDirty = true;

	setInterval(this.draw.bind(this), 33);
	canvas.addEventListener("mousemove", this.checkMouseLocation.bind(this), false);
	canvas.addEventListener("mousedown", this.doMouseDown.bind(this), false);
	canvas.addEventListener("mouseup", this.doMouseClick.bind(this), false);
	canvas.addEventListener("mouseout", this.doMouseExit.bind(this), false);

	var bursts = this.getPropertyArray("bursts");
	var start = 0;
	this.jobs = new Array(this.numJobs);
	for(var i = 0; i < this.numJobs; i++){
		this.jobs[i] = bursts[i];
		start += bursts[i];
		this.context.fillRect(10, 10, bursts[i]*10, 10);
		this.context.translate(60,0);
	}
	
    }



    // make a bunch of Schedulers
    this.makeSchedulers = function() {
	
	//get passed properties...
	var gap = SIMSchedulers.SchedulerCanvas.SCHEDULER_GAP;

	var types = this.getPropertyArray("types");
	if (types.length === 0) types = ["fifo"];

	var colors = this.getPropertyArray("colors");
	var names = this.getPropertyArray("names");
	var bursts = this.getPropertyArray("bursts");
	var numJobs = this.getPropertyArray("bursts").length;
	var atomicN = this.getProperty("atomicNum");
	var schedulers = new Array(types.length);
	var sHeight = Math.floor((this.canvas.height-SIMSchedulers.Button.SIZE)/schedulers.length) - gap;

	// ...use them to make some Schedulers
	for (var i=0; i<types.length; i++) {
	    var c = i>=types.length?undefined:colors[i];
	    schedulers[i] = new SIMSchedulers.Scheduler(types[i], names[i], c, numJobs, bursts, 0, i*(sHeight+gap), this.canvas.width-30, sHeight, atomicN);
	}

	return schedulers;
    }

    // make the array of Button objects
    this.makeButtons = function() {
	var bSize = SIMSchedulers.Button.SIZE;
	var buttons = new Array(6);
	this.buttonThreshold = this.canvas.height - bSize;
	//var button = new SIMSchedulers.Button(1, this.canvas.width/2 - 3*bSize + bSize, this.buttonThreshold);
	for (var i=0; i<buttons.length; i++) buttons[i] = new SIMSchedulers.Button(i, this.canvas.width/2 - 3*bSize + i*bSize, this.buttonThreshold);
	return buttons;
    // return button;
    }

    // get some property that was passed
    this.getProperty = function(propName, defaultValue) {
	var value = canvas.getAttribute("data-"+propName);// IE-compatible
	if (value === undefined) value = defaultValue;
	return value;
    }

    // get a number of things
    this.getPropertyArray = function(propName) {
	var string = canvas.getAttribute("data-"+propName);// IE-compatible
	if (string === null) return [];
	var array = string.split(",");
	for (var i=0; i<array.length; i++) array[i] = array[i].replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	return array;
    }

    // draw function for this canvas
    this.draw = function() {
    	for (var i=0; i<this.schedulers.length; i++) {
		this.schedulers[i].draw(this.context);
	    }
		if (this.isPlaying) this.stepSchedulers();
		if (this.dirtyBit) {
		    this.dirtyBit = false;
	    	for (var i=0; i<this.schedulers.length; i++) {
				this.schedulers[i].draw(this.context);
	    	}
		}

		for (var i=0; i<this.buttons.length; i++) {
	    	this.buttons[i].draw(this.context);
		}
    }

    ////////////////////////////////////////
    // MOUSE FUNCTIONS
    ////////////////////////////////////////

    // look at where the mouse is, to maybe hover over a button
    this.checkMouseLocation = function(event) {
		var x = event.pageX - canvas.offsetLeft;
		var y = event.pageY - canvas.offsetTop;

		var button = this.findButtonInFocus(x, y);
		if (button >= 0) {
	  		canvas.style.cursor="pointer";
	    	for (var i=0; i<this.buttons.length; i++) {
				if (i===button) {
					this.buttons[i].setState(SIMSchedulers.Button.HOVERING);
					this.popUpText(this.buttons[i]);
				}
				else {
					this.buttons[i].setState(SIMSchedulers.Button.UP);
				}
	    	}
		}else {
	    	if (canvas.style.cursor !== "default") canvas.style.cursor="default";
	    	for (var i=0; i<this.buttons.length; i++) {
				this.buttons[i].setState(SIMSchedulers.Button.UP);
	    	}
		this.context.clearRect(this.canvas.width/2 - 200/2,this.canvas.height - SIMSchedulers.Scheduler.TEXTSIZE/2-1-SIMSchedulers.Scheduler.TEXTSIZE - 1,204,SIMSchedulers.Scheduler.TEXTSIZE + 4);
		}
    }

    // on hover, display text NOT WORKING********
    this.popUpText = function(button){
    	var message = " ";
    	if(button.type === SIMSchedulers.Button.PLAYPAUSE){
    		message = "Play/Pause";
    	}
    	else if(button.type === SIMSchedulers.Button.STEPTIME){
    		message = "Step forward by a unit of time";
    	}
    	else if(button.type === SIMSchedulers.Button.STEPCONTEXT){
    		message = "Step forward by a context switch";
    	}
    	else if(button.type === SIMSchedulers.Button.STEPBACKTIME){
    		message = "Step back by a unit of time";
    	}
    	else if(button.type === SIMSchedulers.Button.STEPBACKCONTEXT){
    		message = "Step back by a context switch";
    	}
    	else if(button.type === SIMSchedulers.Button.RESET){
    		message = "Restart from the beginning";
    	}

    	var textX = this.canvas.width/2;
    	var textY = this.canvas.height - SIMSchedulers.Scheduler.TEXTSIZE/2-1;
    	var textWidth = 200;
    	var textHeight = SIMSchedulers.Scheduler.TEXTSIZE;

		this.context.clearRect(this.canvas.width/2 - 200/2,this.canvas.height - SIMSchedulers.Scheduler.TEXTSIZE/2-1-SIMSchedulers.Scheduler.TEXTSIZE - 1,204,SIMSchedulers.Scheduler.TEXTSIZE + 4);

		this.context.fillStyle = '#000000';
		this.context.textAlign = "center";
		this.context.fillText(message,textX,textY,textWidth);//,SIMSchedulers.Scheduler.TEXTSIZE);

    }

    // on exit, set all buttons to unpressed
    this.doMouseExit = function(event) {
	for (var i=0; i<this.buttons.length; i++) {
	    this.buttons[i].setState(SIMSchedulers.Button.UP);
	}
    }

    // makes buttons looked pressed when the mouse is down
    this.doMouseDown = function(event) {
	var x = event.pageX - canvas.offsetLeft;
	var y = event.pageY - canvas.offsetTop;

	var button = this.findButtonInFocus(x, y);
	if (button >= 0) this.buttons[button].setState(SIMSchedulers.Button.PRESSED);
    }

    // on an actual click
    this.doMouseClick = function(event) {
	var x = event.pageX - canvas.offsetLeft;
	var y = event.pageY - canvas.offsetTop;

	var button = this.findButtonInFocus(x, y);
	if (button >= 0) {
	    if (button === SIMSchedulers.Button.PLAYPAUSE) {
			this.togglePlay();
			this.buttons[button].togglePic();
	    }
	    else if (button === SIMSchedulers.Button.RESET) {
	    	for(var i =0; i < this.schedulers.length; i++){
	    		this.schedulers[i].restart();
	    	}
	    }
	    else if (button === SIMSchedulers.Button.STEPCONTEXT) this.stepSchedulers();
	    else if (button === SIMSchedulers.Button.STEPTIME) alert("Step time button not yet implemented");
	    else if (button === SIMSchedulers.Button.STEPBACKCONTEXT) alert("Step back by context button not yet implemented");
	    else if(button === SIMSchedulers.Button.STEPBACKTIME) alert("Step back by time button not yet implemented");  

	    if (button >= SIMSchedulers.Button.ORDER) this.buttons[SIMSchedulers.Button.PLAYPAUSE].togglePic(false);
	    this.buttons[button].setState(SIMSchedulers.Button.HOVERING);
	}   
    }

    // see if we're over one of the buttons
    this.findButtonInFocus = function(x,y) {
	if (y < this.buttonThreshold - SIMSchedulers.Scheduler.TEXTSIZE - 10) return -1;
	for (var i=0; i<this.buttons.length; i++) {
	    if (this.buttons[i].isInRange(x, y)) return i;
	}
	return -1;
    }

    ////////////////////////////////////////
    // PASSING MESSAGES TO Schedulers
    ////////////////////////////////////////

    this.togglePlay = function() {
	this.isPlaying = !this.isPlaying;
    }

        // single step
    this.stepSchedulers = function() {
	var doneCount = 0;
	for (var i=0; i<this.schedulers.length; i++) {
	    if (this.schedulers[i].step()) doneCount++;
	}
	 if (doneCount === this.schedulers.length) {
	    this.isPlaying = false;
	    this.buttons[SIMSchedulers.Button.PLAYPAUSE].togglePic(false);
	}
	this.dirtyBit = true;
    }

    this.init(canvas);
}

// static "constants"
SIMSchedulers.SchedulerCanvas.SCHEDULER_GAP = 20;

///////////////////////////////////////
//  JOB OBJECT
////////////////////////////////////////

SIMSchedulers.Job = function(startTime, burstTime, jobNum){


	////INITIATE JOBS////
	this.init = function(startTime, burstTime, jobNum){
		this.startTime = startTime;
		this.burstTime = burstTime;
		this.jobNum = jobNum;
		this.nextBurst = burstTime;
	}

	this.getNumber = function(){
    	return this.jobNum;
    }

    this.setBurstTime = function(time){
    	this.burstTime = time;
    }

    this.getBurstTime = function(){
    	return this.burstTime;
    }

    this.getNextBurstTime = function(){
    	return this.nextBurst;
    }

    this.setNextBurstTime = function(time){
    	this.nextBurst = time;
    }

    this.getStartTime = function(){
    	return this.startTime;
    }

    this.setEndTime = function(endTime){
    	this.endTime = endTime;
    }

    this.getEndTime = function(){
    	return this.endTime;
    }

    this.init(startTime, burstTime, jobNum);
}

////////////////////////////////////////////////////////////////////////////////
// A SCHEDULER OBJECT
////////////////////////////////////////////////////////////////////////////////

SIMSchedulers.Scheduler = function(type, name, color, numJobs, bursts, x, y, width, height, atomicN) {

    ////////////////////////////////////////
    // INITIALIZATION
    ////////////////////////////////////////

    // pseudo-constructor
    this.init = function(type, name, color, numJobs, bursts, x, y, width, height, atomicN) {
	this.type = type;

	this.type = SIMSchedulers.Scheduler.parseTypeString(type);
	this.colors = SIMSchedulers.makeColors(color);

	this.name = name;
	this.numJobs = numJobs;

	// this.context = context;
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.current = 0;
	this.time = 0;
	this.bursts = bursts;
	this.N = atomicN;

	this.jobs = this.createJobs(numJobs);
	this.jobsQ = this.createJobQ();

	//Total the bursts
	this.totalBurstTime = 0;
	for(var i = 0; i < this.numJobs; i++){
		this.totalBurstTime += parseInt(bursts[i]);
	}

		// initialize what the width of the job bar is going to be by using the burst * the width / all the widths (so that they fit in the canvas)
	this.jobWidths = new Array(numJobs);
	for (var i=0; i<this.numJobs; i++) {
		this.jobWidths[i] = ((this.width-1) * this.bursts[i]) / this.totalBurstTime;
	}

	this.dirtyJob = new Array(numJobs);

	this.jobHeight = 2*height / (3*3-1);//Math.round(2*width / (3*numJobs-1));

	this.jobSpace = 10;
	this.prevJob = null;

	//initialize the colors the jobs in this scheduler will have
	this.jobColors = new Array(numJobs);
	this.colorJobs(0, this.jobColors.length, 3);
	// for (var i=0; i<this.numJobs; i++) this.dirtyJob[i] = false;

	this.nameDirty = this.timeChange = this.tableDirty = true;
	this.clearCanvas = false;


	if (this.type === SIMSchedulers.Scheduler.FIFO) {
	    if (this.name===undefined) this.name = "FIFO Scheduler";
	    this.step = this.stepFIFO;
	    this.restart = this.restartFIFO;
	}

	else if (this.type === SIMSchedulers.Scheduler.SJF) {
	    if (this.name===undefined) this.name = "SJF Scheduler";
	    this.step = this.stepSJF;
	    this.restart = this.restartSJF;
	}

	else if (this.type === SIMSchedulers.Scheduler.SRTF) {
	    if (this.name===undefined) this.name = "SRTF Scheduler";
	    this.step = this.stepSRTF;
	    this.restart = this.restartSRTF;
	}

	else if (this.type === SIMSchedulers.Scheduler.RR) {
	    if (this.name===undefined) this.name = "RR Scheduler: N = " + this.N;
	    this.step = this.stepRR;
	    this.restart = this.restartRR;
	}
	
	this.restart();
    }

    ////////////////////////////////////////
    // DRAWING
    ////////////////////////////////////////
    // draw the individual jobs
    this.draw = function(context) {
		context.save();
		context.setTransform(1, 0, 0, 1, this.x, this.y);

		if(this.clearCanvas){
    		context.clearRect(0, 0+SIMSchedulers.Scheduler.TEXTSIZE, this.width+30, this.height);
    		this.clearCanvas = false;
    	}

		//if the name is different, change it on the canvas
		if (this.nameDirty) {
		    context.clearRect(0, this.height-SIMSchedulers.Scheduler.TEXTSIZE, 100, SIMSchedulers.Scheduler.TEXTSIZE);
		    context.fillStyle = '#000000';
		    context.textAlign = "left";
		    context.fillText(this.name, 0, this.height);
		    this.nameDirty = false;
		}
		//if the time has changed, change it on the canvas
		if (this.timeChange) {
	  	  context.clearRect(this.width-100, this.height-SIMSchedulers.Scheduler.TEXTSIZE, 100, SIMSchedulers.Scheduler.TEXTSIZE);
	  	  context.fillStyle = '#000000';
	  	  context.textAlign = "right";
	  	  context.fillText(this.time, this.width, this.height);
	  	  this.timeChange = false;
		}
		//if the table has changed (needs a highlight, or to be drawn initially) do that
		if(this.tableDirty){
			var dirtyCol = null;
			context.clearRect(0,0,45,20);
			context.clearRect(0,20,45,20);
			context.strokeRect(0,0,45,20);
			context.fillText("jobs", 36, 15);
			context.strokeRect(0,20,45,20);
			context.fillText("bursts", 43, 35);
			for(var i = 1; i < this.numJobs+1; i++){
				context.clearRect(i*45,0,45,20);
				context.clearRect(i*45,20,45,20);
					context.fillStyle = "#000000";
					context.strokeRect(i*45,0,45,20);
					context.fillText(i-1, 25+i*45, 15);
					context.strokeRect(i*45,20,45,20);
					context.fillText(this.bursts[i-1], 29+i*45, 35);
				if(this.dirtyJob[this.jobs[i-1].getNumber()]){
					dirtyCol = this.jobs[i-1].getNumber();
				}
			}
				if(dirtyCol != null){
					context.fillStyle = this.colors[this.jobColors[dirtyCol]];
					context.fillRect((dirtyCol+1)*45,0,45,20);
					context.fillRect((dirtyCol+1)*45,20,45,20);
					context.fillStyle = "#000000";
					context.strokeRect((dirtyCol+1)*45,0,45,20);
					context.strokeRect((dirtyCol+1)*45,20,45,20);
					context.fillText(dirtyCol, 25+(dirtyCol+1)*45, 15);
					context.fillText(this.bursts[dirtyCol], 29+(dirtyCol+1)*45, 35);
				}
			this.tableDirty = false;
		}




		//find which jobs need to be drawn and draw them
		context.strokeStyle = this.colors[0];
		context.lineWidth = 0.25;
		for (var i=0; i<this.jobWidths.length; i++) {
	 	   if (this.allDirty || this.dirtyJob[this.jobs[i].getNumber()]) this.drawJob(i, context);
	   		this.dirtyJob[this.jobs[i].getNumber()] = false;
		}
		this.allDirty = false;

		context.restore();
    }


    // draw a job
    this.drawJob = function(index, context) {

		
		if(this.prevJob){
			//unhighlight old job
			context.fillStyle = this.colors[3];
			context.clearRect(this.jobSpace, this.jobStart, this.jobWidths[this.prevJob.getNumber()], this.jobHeight);
			context.fillRect(this.jobSpace, this.jobStart, this.jobWidths[this.prevJob.getNumber()], this.jobHeight);
			context.fillStyle = "#000000";
			context.lineWidth = 2;
			context.strokeRect(this.jobSpace, this.jobStart, this.jobWidths[this.prevJob.getNumber()], this.jobHeight);
			//add the previous job spaces to find out where this job should start
			this.jobSpace += this.jobWidths[this.prevJob.getNumber()];
		}
		//if its RR, change the jobWidth incase the burst time was shortened, then change the burst time for the next go around
		if(this.type === SIMSchedulers.Scheduler.RR){
			this.jobWidths[this.jobs[index].getNumber()] = ((this.width-1) * this.jobs[index].getBurstTime()) / this.totalBurstTime;
			this.jobs[index].setBurstTime(this.jobs[index].getNextBurstTime());
		}
	
		this.jobStart = this.height-SIMSchedulers.Scheduler.TEXTSIZE*3-SIMSchedulers.Scheduler.TEXTGAP-this.jobHeight;
		context.fillStyle = this.colors[this.jobColors[this.jobs[index].getNumber()]];
	
		//draw the job, the name, the border, and then make this job the prevJob
				
		context.fillRect(this.jobSpace, this.jobStart, this.jobWidths[this.jobs[index].getNumber()], this.jobHeight);
		context.fillStyle = "#000000";
		context.lineWidth = 2;
		context.strokeRect(this.jobSpace, this.jobStart, this.jobWidths[this.jobs[index].getNumber()], this.jobHeight);
		context.fillText("J"+ this.jobs[index].getNumber(), this.jobSpace+this.jobWidths[this.jobs[index].getNumber()]/2, this.jobHeight+65);
		this.prevJob = this.jobs[index];
    }

    ////////////////////////////////////////
    // GENERAL UTILITIES
    ////////////////////////////////////////

    // put all the jobs in the proper order for SJF
    this.sortJobs = function(jobs) {

    	if(this.type === SIMSchedulers.Scheduler.SJF){
    		jobs.sort(function(a,b){if(a.getBurstTime() - b.getBurstTime() === 0) return a.getStartTime() - b.getStartTime(); else return a.getBurstTime() - b.getBurstTime()});
    	}
    	return jobs;
    }


    this.colorJob = function(job, color) {
		this.jobColors[job] = color;
		// this.dirtyJob[job] = true;
    }

    this.colorJobs = function(job0, job1, color) {
		for (var i=job0; i<job1; i++) {
	    	this.jobColors[i] = color;
	    	// this.dirtyJob[i] = true;
		}
    }

    this.createJobs = function(numJobs){
    	//initialize jobs with start time = 0, burst times, and job number
    	var jobs = new Array(numJobs);
    	for (var i=0; i<this.numJobs; i++) {
			jobs[i] = new SIMSchedulers.Job(0, this.bursts[i], i);
		}
		jobs = this.sortJobs(jobs);
		return jobs;
    }

    this.createJobQ = function(){
    	//sort jobs and add to job queue
		
		var jobsQ = [];
		for(var i = 0; i < this.jobs.length; i++) jobsQ.push(this.jobs[i]);
		return jobsQ;
    }

    /////////////////////
	////FIFO SCHEDULER///
	/////////////////////
	this.stepFIFO = function() {
		//make the next job on the queue the current job
		var currentJob = this.jobsQ.shift();
		if(currentJob){
			this.dirtyJob[currentJob.getNumber()] = true;
			this.tableDirty = true;
			//highligh new job
			this.colorJob(currentJob.getNumber(), 4);
			//set end time and current time
			this.timeChange = true;
			this.time+=parseInt(currentJob.getBurstTime());
			currentJob.setEndTime(this.time);
			return false;
		}
		return true;
	}

	this.restartFIFO = function() {
		this.stepCounter = 0;
		this.counterDirty = true;
		this.tableDirty = true;
		this.timeChange = true;
		this.time = 0;
		this.nameDirty = true;
		this.clearCanvas = true;
		this.jobs = this.createJobs();
		this.jobsQ = this.createJobQ();
		this.jobSpace = 10;
		this.jobStart = 0;
		this.prevJob = null;
    }

    /////////////////////
	////SJF SCHEDULER////
	/////////////////////
	this.stepSJF = function() {

		//make the next job on the queue the current job
		var currentJob = this.jobsQ.shift();
		if(currentJob){
			this.dirtyJob[currentJob.getNumber()] = true;
			this.tableDirty = true;
			//set end time and current time
			this.timeChange = true;
			this.time+=parseInt(currentJob.getBurstTime());
			currentJob.setEndTime(this.time);
			//highligh new job
			this.colorJob(currentJob.getNumber(), 4);

			return false;
		}
		return true;
	}

	this.restartSJF = function() {
		this.stepCounter = 0;
		this.tableDirty = true;
		this.counterDirty = true;
		this.timeChange = true;
		this.time = 0;
		// SIMSchedulers.SchedulerCanvas.isPlaying = true;
		this.nameDirty = true;
		this.clearCanvas = true;
		this.jobs = this.createJobs();
		this.jobsQ = this.createJobQ();
		this.jobSpace = 10;
		this.jobStart = 0;
		this.prevJob = null;
    }

	/////////////////////
	////RR SCHEDULER/////
	/////////////////////
	this.stepRR = function() {

		var currentJob = this.jobsQ.shift();
		if(currentJob){
		this.dirtyJob[currentJob.getNumber()] = true;
		this.tableDirty = true;

		// check if burst time is less than N time, if so, reset burst time and add current job back to queue
		if(currentJob.getBurstTime() > this.N){
			currentJob.setNextBurstTime(currentJob.getBurstTime() - this.N);
			currentJob.setBurstTime(this.N);
			this.jobsQ.push(currentJob);
		}
		//highlight new job
		this.colorJob(currentJob.getNumber(), 4);
		//set end time and current time
		this.timeChange = true;
		this.time+=parseInt(currentJob.getBurstTime());
		currentJob.setEndTime(this.time);
		return false;
		} return true;
	}

	this.restartRR = function() {
		this.stepCounter = 0;
		this.tableDirty = true;
		this.counterDirty = true;
		this.timeChange = true;
		this.time = 0;
		// SIMSchedulers.SchedulerCanvas.isPlaying = true;
		this.nameDirty = true;
		this.jobs = this.createJobs();
		this.jobsQ = this.createJobQ();
		this.jobSpace = 10;
		this.jobStart = 0;
		this.clearCanvas = true;
		this.prevJob = null;
    }

    this.init(type, name, color, numJobs, bursts, x, y, width, height, atomicN);

}

SIMSchedulers.Scheduler.FIFO = 0;
SIMSchedulers.Scheduler.SJF = 1;
SIMSchedulers.Scheduler.SRTF = 2;
SIMSchedulers.Scheduler.RR = 3;

SIMSchedulers.Scheduler.TEXTSIZE = 15;
SIMSchedulers.Scheduler.TEXTGAP = 5;

SIMSchedulers.Scheduler.parseTypeString = function(string) {
    if (string === "fifo") return SIMSchedulers.Scheduler.FIFO;
    if (string === "sjf") return SIMSchedulers.Scheduler.SJF;
    if (string === "srtf") return SIMSchedulers.Scheduler.SRTF;
    if (string === "rr") return SIMSchedulers.Scheduler.RR;
}

////////////////////////////////////////////////////////////////////////////
// THE BUTTON OBJECT
////////////////////////////////////////////////////////////////////////////

SIMSchedulers.Button = function(type, x, y) {

    this.init = function(type, x, y) {
	this.type = type;
	this.x = x;
	this.y = y - SIMSchedulers.Scheduler.TEXTSIZE - 10;
	this.state = SIMSchedulers.Button.UP;
	this.dirtyBit = true;
	this.height = SIMSchedulers.Button.SIZE;
	this.width = SIMSchedulers.Button.SIZE;

	this.useAltPic = false;
    }

    this.draw = function(context) {

	context.save();
	context.setTransform(1, 0, 0, -1, this.x, this.y+this.height);

	context.strokeStyle = "#666666";

	context.clearRect(0, 0, this.width, this.height);

	if (this.state === SIMSchedulers.Button.HOVERING || this.state === SIMSchedulers.Button.PRESSED) {
	    context.beginPath();
	    context.moveTo(0.5, this.height-4.5);
	    context.quadraticCurveTo(0.5, this.height-0.5, 4.5, this.height-0.5);
	    context.lineTo(this.width-4.5, this.height-0.5);
	    context.quadraticCurveTo(this.width-0.5, this.height-0.5, this.width-0.5, this.height-4.5);
	    context.lineTo(this.width-0.5, 4.5);
	    context.quadraticCurveTo(this.width-0.5, 0.5, this.width-4.5, 0.5);
	    context.lineTo(4.5, 0.5);
	    context.quadraticCurveTo(0.5, 0.5, 0.5, 4.5);
	    context.closePath();
	    context.stroke();
	    if (this.state === SIMSchedulers.Button.PRESSED) 	{
		context.fillStyle = "rgba(0,0,0,0.1)";
		context.fill();
	    }
	}

	if (this.state === SIMSchedulers.Button.UP) context.fillStyle = "#990000";
	else if (this.state === SIMSchedulers.Button.HOVERING) context.fillStyle = "#FF0000";
	else if (this.state === SIMSchedulers.Button.PRESSED) context.fillStyle = "#FF9900";
	else alert("bad state! " +this.state);

	context.translate(this.width/2-10, this.height/2-10);

	context.shadowOffsetX=.5;
	context.shadowOffsetY=1;
	context.shadowBlur=1;
	context.shadowColor="rgba(0,0,0,0.5)";

	
	if (type === SIMSchedulers.Button.PLAYPAUSE) {
	    if (this.useAltPic) { // pause
		context.strokeRect(1, 1, 7, 18);
		context.strokeRect(12, 1, 7, 18);
	    }
	    else { // play
		context.beginPath();
		context.moveTo(1,0);
		context.lineTo(20,10);
		context.lineTo(1,20);
		context.closePath();
		context.stroke();
	   	}
	}
	else if (type === SIMSchedulers.Button.RESET){
	  	context.beginPath();

		context.moveTo(20,0);
		context.lineTo(1,10);
		context.lineTo(20,20);
		context.closePath();

	    context.stroke();
	}
	else if (type === SIMSchedulers.Button.STEPTIME){
	    context.beginPath();

	    context.moveTo(12,10);
	    context.lineTo(6,16);
	    context.bezierCurveTo(3, 19, 6, 22, 9, 19);  
	    context.lineTo(18,10);
	    context.lineTo(9,1);
	    context.bezierCurveTo(6, -2, 3, 1, 6, 4);  
	    context.closePath();

	    context.stroke();
	}
	else if (type === SIMSchedulers.Button.STEPCONTEXT) {
	    context.beginPath();

	    context.moveTo(18,10);
	    context.lineTo(12,16);
	    context.bezierCurveTo(9, 19, 12, 22, 15, 19);  
	    context.lineTo(24,10);
	    context.lineTo(15,1);
	    context.bezierCurveTo(12, -2, 9, 1, 12, 4);  
	    context.closePath();

	    context.moveTo(8,10);
	    context.lineTo(2,16);
	    context.bezierCurveTo(-1, 19, 2, 22, 5, 19);  
	    context.lineTo(14,10);
	    context.lineTo(5,1);
	    context.bezierCurveTo(2, -2, -1, 1, 2, 4);  
	    context.closePath();

	    context.stroke();
	}
	else if (type === SIMSchedulers.Button.STEPBACKCONTEXT) {
	  	context.beginPath();

	    context.moveTo(14,10);
	    context.lineTo(20,16);
	    context.bezierCurveTo(23, 19, 20, 22, 17, 19);  
	    context.lineTo(8,10);
	    context.lineTo(17,1);
	    context.bezierCurveTo(20, -2, 23, 1, 20, 4);
	   	context.closePath();

		context.moveTo(4,10);
	    context.lineTo(10,16);
	    context.bezierCurveTo(13, 19, 10, 22, 7, 19);  
	    context.lineTo(-2,10);
	    context.lineTo(7,1);
	    context.bezierCurveTo(10, -2, 13, 1, 10, 4);
	    context.closePath();

	    context.stroke();
	} 

	else if (type === SIMSchedulers.Button.STEPBACKTIME){
	    context.beginPath();

	   	context.moveTo(8,10);
	    context.lineTo(14,16);
	    context.bezierCurveTo(17, 19, 14, 22, 11, 19);  
	    context.lineTo(2,10);
	    context.lineTo(11,1);
	    context.bezierCurveTo(14, -2, 17, 1, 14, 4);  
	    context.closePath();

	    context.stroke();
	}
	

	context.restore();
	this.dirtyBit = false;
    }

    this.setState = function(newState) {
	if (this.state === newState) return;

	this.state = newState;
	this.dirtyBit = true;
    }

    this.isInRange = function(x, y) {
	if (x >= this.x && x < this.x + SIMSchedulers.Button.SIZE && y >= this.y && y < this.y + SIMSchedulers.Button.SIZE) return true;
	return false;
    }

    this.togglePic = function(input) {
	if (input === undefined) this.useAltPic = !this.useAltPic;
	else this.useAltPic = input;
	this.dirtyBit = true;
    }

    this.init(type, x, y);
}

// static "constants"
SIMSchedulers.Button.SIZE = 35;
SIMSchedulers.Button.UP = 0;
SIMSchedulers.Button.HOVERING = 1;
SIMSchedulers.Button.PRESSED = 2;

SIMSchedulers.Button.RESET = 2;
SIMSchedulers.Button.STEPBACKTIME = 0;
SIMSchedulers.Button.STEPBACKCONTEXT = 1;
SIMSchedulers.Button.PLAYPAUSE = 3;
SIMSchedulers.Button.STEPCONTEXT = 4;
SIMSchedulers.Button.STEPTIME = 5;

////////////////////////////////////////////////////////////////////////////////
// "STATIC" FUNCTIONS
////////////////////////////////////////////////////////////////////////////////

SIMSchedulers.makeColors = function(color) {
    var r=0, g=0, b=0;
    if (color === "red" || color===undefined) r = 170;
    else if (color === "orange") r = 200, g = 100;
    else if (color === "yellow") r = g = 170;
    else if (color === "green") g = 170;
    else if (color === "blue") b = 204;
    else if (color === "purple") r = b = 128;

    // calculate HSV
    var h, s, v = Math.max(r,g,b);
    var min = Math.min(r,g,b);
    var delta = v-min;

    if (v===0) h=s=0;
    else {
	s = delta/v;
	if (r === v) h = (g-b)/delta;
	else if (g === v) h = 2 + (b-r)/delta;
	else h = 4 + (r-g)/delta;
	if (h<0) h += 6;
    }

    var colors = new Array(5);
    colors[5] = SIMSchedulers.hsv2String(h, s, v*2.25);
    colors[4] = SIMSchedulers.hsv2String(h, s, v*1.5);
    colors[3] = SIMSchedulers.hsv2String(h, s, v);
    colors[2] = SIMSchedulers.hsv2String(h, s, v*2/3);
    colors[1] = SIMSchedulers.hsv2String(h, s, v*4/9);
    colors[0] = SIMSchedulers.hsv2String(h, s, v*0.25);

    return colors;
}

SIMSchedulers.hsv2String = function(h, s, v) {
    var r, g, b;

    // if we got brightness above allowed, adjust it back & take away saturation
    if (v > 255) {
	s -= (v-255)/255;
	v = 255;
	if (s < 0) s = 0;
    }

    // the actual HSV->RGB calculation
    if (s===0) r = g = b = v;
    else {
	var i = Math.floor(h);
	var f = h-i;
	var p = v*(1-s), q = v*(1-s*f), t = v*(1-s*(1-f));
	switch(i) {
	case 0: r = v; g = t; b = p; break;
	case 1: r = q; g = v; b = p; break;
	case 2: r = p; g = v; b = t; break;
	case 3: r = p; g = q; b = v; break;
	case 4: r = t; g = p; b = v; break;
	case 5: r = v; g = p; b = q; break;
	}
    }

    // final rounding/parsing
    r = Math.round(r);
    g = Math.round(g);
    b = Math.round(b);

    var string = "#";
    if (r < 16) string += "0";
    string += r.toString(16);
    if (g < 16) string += "0";
    string += g.toString(16);
    if (b < 16) string += "0";
    string += b.toString(16);
    return string;
}

window.addEventListener('load', SIMSchedulers.go, false);