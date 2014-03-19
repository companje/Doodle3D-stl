var gcode;
var wifibox_ip = "10.0.0.244";
var doodle3d_api = "http://"+wifibox_ip+"/d3dapi/";
var cura_api = "http://companje.nl/cura/";
var chunks = [];

$(function(){
	$( "[data-role='header'], [data-role='footer']" ).toolbar();
});

$("#btnStop").click(function() {
	console.log("stop print");
	$.ajax({
		url: doodle3d_api + "printer/stop",
		type: "POST"
	});
});

$("#btnPrint").click(function() {
	showLoader(true,"Converting STL to GCODE...");

	setInterval(updateProgress,1000);

	var gcode_file = cura_api + "?input=" + $("#stl_file").val();

	$.get(gcode_file, function(data) {
		gcode = data;

		var lines = gcode.split("\n");
		var chunkMaxLines = 500;
		chunks = []; //empty

		console.log("total lines: ",lines.length);
		console.log("dividing into: ",Math.ceil(lines.length/chunkMaxLines),"chunks");
		console.log("average chunk size: ",lines.slice(0,500).join("\n").length,"bytes")

		for (var i=0; i<lines.length / chunkMaxLines; i++) {
			var from = i*chunkMaxLines;
			var to = chunkMaxLines*(i+1)-1;
			to = Math.min(to,lines.length-1);
			var chunk = lines.slice(from,to).join("\n");
			chunks.push(chunk);
		}
	
		sendChunk(0);
	})
});

function sendChunk(current) {
	console.log("sending chunk",current+1,"of",chunks.length);
	
	var data = { gcode:chunks[current], first:current==0, start:current==0 };
	
	showLoader(true,"Uploading GCODE... "+(Math.ceil((current+1)/(chunks.length)*100))+"%");

	$.ajax({
		url: doodle3d_api + "printer/print",
		type: "POST",
		data: data,
		dataType: 'json',
		timeout: 5000, //this.sendPrintPartTimeoutTime,
		success: function(data) {
			console.log("send chunk",current,"success",data);
			
			if (current>=chunks.length-1) {
				console.log("done");
				showLoader(false);
			} else if (data.status=="success") {
				sendChunk(current+1);
			} else if (data.status=="error") {

			}
		}
	}).fail(function(data) {
		console.log("send chunk failed",data);
	});		
}

function updateProgress() {
	$.get(doodle3d_api+"printer/progress", function(data) {
		var curent_line = data.data.current_line;
		var total_lines = data.data.total_lines;
		var progress;

		if (total_lines==0) {
			progress = 0;
		} else {
			progress = Math.round(curent_line/total_lines*100*100)/100; //round two decimals
		}

		$("#printing h1").text("Printing... " + progress + "%");

	});
}

function showLoader(b,text) {
	if (b==true) $.mobile.loading("show", {text:text, textVisible: text!=undefined} );
	else $.mobile.loading("hide");
}