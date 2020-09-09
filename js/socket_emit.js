function socket_emit() {
  socket = io();
  var rid = [];
  var solGainVal = 0;
  var cs_id = "";
  var file_name = "";
  var file_loc = "";
  rpccr_id = [];
  rpccr_layer = [];
  var bbox = "";
  
  socket.on('connect', function () {
    console.log('connected!');
  });

  socket.on('error', function(err) {
    alert(err.error);
  });

  socket.on("test", function(tmpData) {
    console.log(tmpData);
  });

  socket.on('get_rid', function(tmpData) {
    d3.select("#progBar")
      .attr("aria-valuenow", 10)
      .style("width", "10%")
      .text("10%");

    //cs_id = infoObj[gjCurName].replace(" ", "_") +"-" + selFeats.toString().replace(",", "_");
    var tmpSecs = new Date().getHours() * 3600 + new Date().getMinutes() * 60 + new Date().getSeconds();
    cs_id = infoObj[gjCurName].replace(" ", "_") + "-" + tmpSecs;
    file_name = cs_id + ".tif";
    file_loc = "///home/jason/ottawa/tifs/" + file_name;

    rid = [];
    tmpData.forEach(function(obj) {
      var tmpRid = "";
      for (var i=0; i<obj.length; i++) {
        if (i == 0) {
          tmpRid = " and (a.rid = " + obj[0].rid;
        }
        else {
          tmpRid += " or a.rid = " + obj[i].rid;
        }
      }
      tmpRid += ")";
      rid.push(tmpRid);
    });

    if(critUsed[critUsed.length -1].value > 0) {
      input = {"layer": gjCurName, "oid": tmpOid, "rid": rid[rid.length - 1], "solGainCrit": critUsed[critUsed.length - 1]};
      socket.emit('solar_gain_percentile', input);
    }
    else {
      d3.select("#progBar")
        .attr("aria-valuenow", 20)
        .style("width", "20%")
        .text("20%");
      input = {"layer": gjCurName, "oid": tmpOid, "rid": rid, "crit": critUsed, "file_name": file_name};
      socket.emit('map_algebra', input);
    }      
  });

  socket.on('solar_gain_percentile', function(tmpData) {
    d3.select("#progBar")
      .attr("aria-valuenow", 20)
      .style("width", "20%")
      .text("20%");

    critUsed[critUsed.length -1].value = tmpData.value;

    input = {"layer": gjCurName, "oid": tmpOid, "rid": rid, "crit": critUsed, "file_name": file_name};
    socket.emit('map_algebra', input);
  });

  socket.on('map_algebra', function(tmpData) {
    d3.select("#progBar")
      .attr("aria-valuenow", 30)
      .style("width", "30%")
      .text("30%");

    //***remove solar gain from critUsed if not explicity specified in criteria
    if(tmpBi == 0) {
      critUsed.splice(critUsed.length - 1,1);
    }
    rpccr_id.push(cs_id);
    input = {"file_name": file_name};
    socket.emit('zip_it', input);
  });

  socket.on('zip_it', function(tmpData) {
    d3.select("#progBar")
      .attr("aria-valuenow", 40)
      .style("width", "40%")
      .text("40%");

    input = {"ws":"ottawa"}; //, "cs": cs_id, "file": file_loc, "style":"rpccr_style"};
    socket.emit('add_ws', input);
  });

  socket.on('add_ws', function(tmpData) {
    d3.select("#progBar")
      .attr("aria-valuenow", 50)
      .style("width", "50%")
      .text("50%");

    input = {"ws":"ottawa", "cs": cs_id, "file": file_loc};
    socket.emit('add_cs', input);
  });

  socket.on('add_cs', function(tmpData) {
    d3.select("#progBar")
      .attr("aria-valuenow", 60)
      .style("width", "60%")
      .text("60%");

    input = {"ws":"ottawa", "cs": cs_id, "cov": cs_id};
    socket.emit('add_coverage', input);
  });

  socket.on('add_coverage', function(tmpData) {
    d3.select("#progBar")
      .attr("aria-valuenow", 70)
      .style("width", "70%")
      .text("70%");
    
    input = {"ws": "ottawa", "style":"onf_rpccr"};
    socket.emit('add_style', input);
  });

  socket.on('add_style', function(tmpData) {
    d3.select("#progBar")
      .attr("aria-valuenow", 80)
      .style("width", "80%")
      .text("80%");

    input = {"ws": "ottawa", "layer": cs_id, "style": "onf_rpccr"};
    socket.emit('change_style', input);
  });

  socket.on('change_style', function(tmpData) {
    d3.select("#progBar")
      .attr("aria-valuenow", 90)
      .style("width", "90%")
      .text("90%");

    var input = {"layer": gjCurName, "oid": tmpOid};
    socket.emit('get_bbox', input);
  });

  socket.on('get_bbox', function(tmpData) {
    //******Initialize bootstrap tooltip
    $(function() {
      $('[data-toggle="tooltip"]').tooltip();
    });

    var tmpBbox = tmpData[0].bbox.replace("BOX(","").replace(")","").split(",");
    var bbox = [];
    tmpBbox.forEach(function(coords) { bbox.push(coords.split(" ")); });

    d3.select("#progBar")
      .attr("aria-valuenow", 100)
      .style("width", "100%")
      .text("100%");

    rpccr_layer.push(L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
      layers: 'ottawa:' + cs_id,
      format: 'image/png',
      transparent: true,
      tiled: true,
      version: '1.3.0',
      maxZoom: 22
    }));

    var tmpFeats = "<ul>";
    selNames.forEach(function(feat) { tmpFeats += "<li>" + feat + "</li>"; });
    tmpFeats += "</ul>";
    
    var tmpCrit = "<ul>";
    d3.selectAll(".critAddedDiv")
      .each(function(d) { tmpCrit += "<li>" + d3.select(this).select("p").text() + "</li>"; });
    tmpCrit += "</ul>";
    

    d3.select("#rpccrDiv")
      .append("div")
      .attr("id", cs_id)
      .html('<p class="rpccrP">' + cs_id
        + '<span class="fa fa-info-circle" data-toggle="tooltip" data-container="body" data-placement="auto" data-html="true" title="<ul><li>Layer: ' + infoObj[gjCurName] + '</li><li>Areas: ' + tmpFeats + '</li><li>Criteria: ' + tmpCrit + '</li></ul>"></span>'
        + '<span id="chk_' + cs_id + '" value="' + (rpccr_layer.length - 1) + '" class="fa fa-check-square" title="Click to hide layer"></span>'
        + '<span id="eye_' + cs_id + '" value="' + (rpccr_layer.length - 1) + '" data-opa="100" class="fa fa-eye" title="Click to change layer opacity | Current: 100%"></span>'
        + '<span id="zoom_' + cs_id + '" class="fa fa-search-plus" title="Click to zoom to layer"></span>'
        + '<a class="rpccrA" href="zips/' + cs_id + '.zip" target="_blank">'
          + '<span id="zip_' + cs_id + '" class="fa fa-download" title="Click to download layer"></span>'
        + '</a>'
        + '<span id="remove_' + cs_id + '" value="' + (rpccr_layer.length - 1) + '" data-div="' + cs_id + '" class="critRemove fa fa-times-circle" title="Click to permanently remove results layer"></span>'
      + '</p>');

    d3.select("#chk_" + cs_id)
      .on("click", function() {
        var tmpChk = d3.select(this);
        if(tmpChk.classed("fa-check-square")) {
          tmpChk.classed("fa-check-square", false).classed("fa-check-square-o", true).property("title", "Click to show layer");
          map.removeLayer(rpccr_layer[tmpChk.attr("value")]); 
        }
        else {
          tmpChk.classed("fa-check-square", true).classed("fa-check-square-o", false).property("title", "Click to hide layer");
          map.addLayer(rpccr_layer[tmpChk.attr("value")]);
          rpccr_layer[tmpChk.attr("value")].bringToFront();
        }     
      });
   
    d3.select("#eye_" + cs_id)
      .on("click", function() {
        var tmpEye = d3.select(this);
        var tmpOpa = tmpEye.attr("data-opa");
        switch(tmpOpa) {
          case "100":
            rpccr_layer[tmpEye.attr("value")].setOpacity(0.75);
            tmpEye.attr("data-opa", "75");
            tmpEye.property("title", "Click to change layer opacity | Current: 75%");
            break;
          case "75":
            rpccr_layer[tmpEye.attr("value")].setOpacity(0.5);
            tmpEye.attr("data-opa", "50");
            tmpEye.property("title", "Click to change layer opacity | Current: 50%");
            break;
          case "50":
            rpccr_layer[tmpEye.attr("value")].setOpacity(0.25);
            tmpEye.attr("data-opa", "25");
            tmpEye.property("title", "Click to change layer opacity | Current: 25%");
            break;
          case "25":
            rpccr_layer[tmpEye.attr("value")].setOpacity(1);
            tmpEye.attr("data-opa", "100");
            tmpEye.property("title", "Click to change layer opacity | Current: 100%");
            break;
        }
      });

    d3.select("#zoom_" + cs_id)
      .on("click", function() { map.fitBounds([[bbox[0][1], bbox[0][0]], [bbox[1][1], bbox[1][0]]]); });

    d3.select("#remove_" + cs_id)
      .on("click", function() {
        map.removeLayer(rpccr_layer[d3.select(this).attr("value")]); 
        console.log(d3.select(this).attr("data-div"));
        d3.select("#" + d3.select(this).attr("data-div")).remove();
        if(d3.select("#rpccrDiv").selectAll("div").size() == 0) {
          d3.select("#resultsDiv").style("display", "none");
        }
      });

    d3.select("#resultsDiv").style("display", "block");

    map.addLayer(rpccr_layer[rpccr_layer.length - 1]);
    rpccr_layer[rpccr_layer.length - 1].bringToFront();
    map.fitBounds([[bbox[0][1], bbox[0][0]], [bbox[1][1], bbox[1][0]]]);
    $("#featSelReset").click();

    infoIDField[cs_id] = "GRAY_INDEX";
    infoObj[cs_id] = cs_id;
    infoDataType[cs_id] = "raster";

  });




}

