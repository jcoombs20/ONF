function initPage() {

  //******Initialize bootstrap tooltip
  $(function() {
    $('[data-toggle="tooltip"]').tooltip();
  });

  //******Call function to reposition windows on resize
  window.addEventListener('resize', resizePanels);



  //******Remove created geoserver layers and zip files.
  $(window).on('beforeunload', function(){
    for (var i=0;i<rpccr_id.length;i++) {
      input = {"ws":"ottawa", "cs": rpccr_id[i], "style": "onf_rpccr", "file_name": rpccr_id[i] + ".tif"};
      socket.emit('delete_rpccr_data', input);
    }
/*
    for (var x=0;x<download_id.length;x++) {
      input = {"file_name": download_id[x]};
      socket.emit('delete_download_data', input);
    }
*/
  });



  map = new L.Map('map', {attributionControl: false, zoomControl: false, minZoom: 5, maxZoom: 19, inertiaDeceleration: 1000, worldCopyJump: true, maxBounds: [[75,-176],[0,-35]]});
  map.fitBounds([[41.5,-91],[47.9,-82]]);

  //******Watch events and get data from postgres when level is appropriate and add as SVG
  map.on("moveend", function(event) { d3.select("#map").style("cursor", ""); });
  map.on("movestart", function() { d3.select("#map").style("cursor", "grabbing"); });


  L.control.mousePosition().addTo(map);

  //***Bing geocoder control
  var tmpPoint = new L.marker;
  var bingGeocoder = new L.Control.BingGeocoder('At3gymJqaoGjGje-JJ-R5tJOuilUk-gd7SQ0DBZlTXTsRoMfVWU08ZWF1X7QKRRn', { callback: function (results)
    {
      if(results.statusCode == 200) {
        if(d3.select("#bingGeocoderSubmit").classed("fa-search")) {
          $(document).ready(function(){
            $('[data-toggle="tooltip"]').tooltip();   
          });
          document.getElementById("bingGeocoderInput").blur();
          var bbox = results.resourceSets[0].resources[0].bbox,
            first = new L.LatLng(bbox[0], bbox[1]),
            second = new L.LatLng(bbox[2], bbox[3]),
            tmpBounds = new L.LatLngBounds([first, second]);
          this._map.fitBounds(tmpBounds);
          this._map.removeLayer(tmpPoint);
          tmpPoint = new L.marker(results.resourceSets[0].resources[0].point.coordinates);
          this._map.addLayer(tmpPoint);
          d3.select(".leaflet-marker-icon")
            .attr("id","mapIcon")
            .attr("value", results.resourceSets[0].resources[0].name)
            .attr("data-toggle", "tooltip")
            .attr("data-container", "body")
            .attr("data-placement", "top")
            .attr("data-html", "true")
            .attr("title", '<p><b>' + results.resourceSets[0].resources[0].name + '</b></p>');
          d3.select(tmpPoint)
            .on("click", function() { clearSearch(); });
          d3.select("#bingGeocoderSubmit")
            .classed("fa-search", false)
            .classed("fa-times", true)
            .property("title", "Click to clear locate results");
        }
        else {
          clearSearch();
        }
      }
      else {
        d3.select("#bingGeocoderInput").property("value","No matching results");    
      }
    }
  });


  //******Make headerControls div
  d3.select("body")
    .insert("div", ":first-child")
    .attr("id", "headerControls");


  //******Make header div
  d3.select("body")
    .insert("div", ":first-child")
    .attr("class", "header")
    .style("padding", "3px 0px 3px 15px")
    .style("height", "40px")
    .html('<img id="titleImg" src="images/tree_icon.png"></img><span class="brand">MI Riparian Planting Prioritization Tool</span> <div id="headerLinks"><a id="launchIntro" href="#" title="Click to launch introduction tutorial" onclick="startIntro()">Tutorial</a><a id="showDetails" title="Click to display informational details about this tool" href="#" data-toggle="modal" data-target="#helpDiv">About</a></div><div id="printDownload" class="pull-right"><span id="downloadControl" class="glyphicon glyphicon-download-alt" title="Download spatial data" onclick="toolWindowToggle(&quot;download&quot;)"></span><span id="printControl" class="fa fa-print" title="Print current map" onclick="window.print()"></span></div>');
    //.html('<span class="brand">MI Riparian Planting Prioritization Tool</span> <div id="headerLinks"><a id="showWelcome" href="#" title="Click to show the welcome screen" onclick="d3.select(&quot;#splashScreen&quot;).style(&quot;display&quot;,&quot;flex&quot;)">Welcome</a><a id="launchIntro" href="#" title="Click to launch introduction tutorial" onclick="startIntro()">Tutorial</a><a id="showDetails" title="Click to display informational details about this tool" href="#" data-toggle="modal" data-target="#helpDiv">About</a><a title="Click to go to the Ecosheds homepage" href="http://ecosheds.org" target="_blank">SHEDS Home</a></div><div id="printDownload" class="pull-right"><span id="downloadControl" class="glyphicon glyphicon-download-alt" title="Download spatial data" onclick="toolWindowToggle(&quot;download&quot;)"></span><span id="printControl" class="glyphicon glyphicon-print" title="Print current map" onclick="window.print()"></span></div>');


  //******Make div for geolocater
  d3.select("body")
    .append("div")
    .attr("class", "legend gradDown")
    .attr("id", "locateDiv");

  $('#locateDiv').draggable({containment: "html", cancel: ".toggle-group,input,textarea,button,select,option"});

  d3.select("#locateDiv")
    .append("h4")
    .text("Locate")
    .attr("class", "legTitle")
    .attr("id", "locateTitle")
    .append("span")
    .html('<span class="fa fa-info-circle" data-toggle="tooltip" data-container="body" data-placement="auto" data-html="true" title="<p><u><b>Locate</b></u></p><p>Enter name or coordinates to zoom to a location on the map.</p>"</span>');
 
  d3.select("#locateTitle")
    .html(d3.select("#locateTitle").html() + '<div class="exitDiv"><span id="hideLocate" class="fa fa-times-circle" data-toggle="tooltip" data-container="body" data-placement="auto" data-html="true" title="<p>Click to hide window</p>"</span></div>'); 

  d3.select("#hideLocate")
    .on("click", function() { toolWindowToggle("locate"); });

  d3.select("#locateDiv")
    .append("div")
    .attr("id", "bingGeoLocate");



  document.getElementById('bingGeoLocate').appendChild(bingGeocoder.onAdd(map));
  d3.select("#bingGeocoderInput")
    .on("mouseup", function() { if(this.value == "No matching results") { this.value = ""; } else { $(this).select(); } })
    .on("blur", function() { modifySearch(this, "blur"); })
    .on("keyup", function() { modifySearch(this, "key"); });

  function modifySearch(tmpEl, tmpEvent) {
    if(tmpEvent == "blur") {
      if((tmpEl.value == "" || tmpEl.value == "No matching results") && document.getElementById("mapIcon")) { 
        tmpEl.value = d3.select("#mapIcon").attr("value"); 
        d3.select("#bingGeocoderSubmit").classed("fa-times", true).classed("fa-search", false);
      }
      else if(tmpEl.value == "No matching results" && !document.getElementById("mapIcon")) {
        tmpEl.value = "";
      }
    } 
    else if(document.getElementById("mapIcon")) {
      if(tmpEl.value != d3.select("#mapIcon").attr("value")) {
        d3.select("#bingGeocoderSubmit").classed("fa-times", false).classed("fa-search", true);
      }
      else {
        d3.select("#bingGeocoderSubmit").classed("fa-times", true).classed("fa-search", false);
      }
    }
  }





  //******Clear the results of the geo search
  function clearSearch() {
    map.removeLayer(tmpPoint);
    d3.select(".tooltip").remove();
    d3.select("#bingGeocoderInput").property("value", "");

    d3.select("#bingGeocoderSubmit")
      .classed("fa-times", false)
      .classed("fa-search", true)
      .style("background", "")
      .property("title", "Click to zoom to specified location");
  }


  //***Add in backgrounds
  var googleHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
  });
  var googleSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
  }); 
  var googleStreet = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
  });
  var googleTerrain = L.tileLayer('https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
  });

      var bingHybrid = new L.BingLayer("At3gymJqaoGjGje-JJ-R5tJOuilUk-gd7SQ0DBZlTXTsRoMfVWU08ZWF1X7QKRRn", {type: 'AerialWithLabels'});
      var bingSatellite = new L.BingLayer("At3gymJqaoGjGje-JJ-R5tJOuilUk-gd7SQ0DBZlTXTsRoMfVWU08ZWF1X7QKRRn", {type: 'Aerial'});
      var bingStreet = new L.BingLayer("At3gymJqaoGjGje-JJ-R5tJOuilUk-gd7SQ0DBZlTXTsRoMfVWU08ZWF1X7QKRRn", {type: 'Road'});

  var usgsTopo = new L.tileLayer('https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 15,
    zIndex: 0,
    attribution: '<a href="http://www.doi.gov">U.S. Department of the Interior</a> | <a href="https://www.usgs.gov">U.S. Geological Survey</a> | <a href="https://www.usgs.gov/laws/policies_notices.html">Policies</a>'
  });

  var blank = new L.tileLayer('');


  //***Add in overlays
  var land_cover = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:land_cover_2016',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });

  var imp_sur = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:impervious_2016',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });

  var imp_descr = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:impervious_descr_2016',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });

  var tree_can = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:tree_canopy_2016',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });

  var elevation = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:elevation_30m',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });

/*
  var solar_rad = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:solar_rad_30m',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });
*/

  var solar_rad_180 = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:solar_rad_30m_180',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });

  var consec_years = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:consec_years_detected_clipped',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });

  var counties = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:cb_2018_us_county_500k_mi_wgs84',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });

  var NF = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:s_usa_administrativeforest_mi_wgs84',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });

  huc8 = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:wbdhu8_mi',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });

  var huc10 = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:wbdhu10_mi',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });

  huc12 = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:wbdhu12_mi',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });

  var streams = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:nhd24k_mi_lake_erase_no_coast',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });

/*
  var streams2 = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:fishvis_streams_mi',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });
*/

  var lakes = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:nhdwaterbody_lakes',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });

  var background = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:bbox_mi',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });

  intro_example = L.tileLayer.wms('https://ecosheds.org/geoserver/wms', {
    layers: 'ottawa:intro_example',
    format: 'image/png',
    transparent: true,
    tiled: true,
    version: '1.3.0',
    maxZoom: 22
  });

  //******Add geojson files for feature selection
  gjCounties = null; 
  gjNF = null; 
  gjHUC8 = null; 
  gjHUC10 = null; 
  gjHUC12 = null; 
  var gjLayers = [null,null,null,null,null,null];

  d3.json("gis/s_usa_administrativeforest_mi_wgs84.json")
    .then(function(data) {
      var gj = topojson.feature(data, data.objects.s_usa_administrativeforest_mi_wgs84);
      gjLayers[1] = L.geoJSON(gj, { style: polyLayer, onEachFeature: polyLayerFeatures });
  });

  d3.json("gis/cb_2018_us_county_500k_mi_wgs84.json")
    .then(function(data) {
      var gj = topojson.feature(data, data.objects.cb_2018_us_county_500k_mi_wgs84);
      gjLayers[2] = L.geoJSON(gj, { style: polyLayer, onEachFeature: polyLayerFeatures });
  });

  d3.json("gis/wbdhu8_a_mi.json")
    .then(function(data) {
      var gj = topojson.feature(data, data.objects.wbdhu8_a_mi);
      gjLayers[3] = L.geoJSON(gj, { style: polyLayer, onEachFeature: polyLayerFeatures });
  });

  d3.json("gis/wbdhu10_a_mi.json")
    .then(function(data) {
      var gj = topojson.feature(data, data.objects.wbdhu10_a_mi);
      gjLayers[4] = L.geoJSON(gj, { style: polyLayer, onEachFeature: polyLayerFeatures });
  });

  d3.json("gis/wbdhu12_a_mi.json")
    .then(function(data) {
      var gj = topojson.feature(data, data.objects.wbdhu12_a_mi);
      gjLayers[5] = L.geoJSON(gj, { style: polyLayer, onEachFeature: polyLayerFeatures });
  });


  //***Feature selection layer styles
  function polyLayer(feature) {
    return {
      fillColor: "white",
      fillOpacity: 0.01,
      color: "black",
      weight: map.getZoom()/3
    };
  }

  function polyLayerSelect(feature) {
    return {
      fillColor: "aqua",
      fillOpacity: 0.5,
      color: "navy",
    };
  }

  function polyLayerHover(feature) {
    return {
      fillColor: "yellow",
      fillOpacity: 0.5,
      color: "fuchsia",
    };
  }

  function polyLayerSelectHover(feature) {
    return {
      fillColor: "aqua",
      fillOpacity: 0.5,
      color: "fuchsia",
    };
  }

  //***Feature selection events
  selFeats = [];
  selNames = [];
  var selEvents = [];
  function polyLayerFeatures(feature, layer){
    layer.on({
      click: function(e) {
        if(selFeats.indexOf(e.target.feature.id) == -1) {
          selFeats.push(e.target.feature.id);
          selNames.push(e.target.feature.properties.NAME);
          selEvents.push(e.target);
          e.target.setStyle(polyLayerSelectHover());
        }
        else {
          var j = selFeats.indexOf(e.target.feature.id);
          selFeats.splice(j, 1);
          selNames.splice(j, 1);
          selEvents.splice(j, 1);
          e.target.setStyle(polyLayerHover());
        }          
        L.DomEvent.stopPropagation(e); // stop click event from being propagated further
      },
      dblclick: function(e) {
        selFeats.forEach(function(id, i) {
          selEvents[i].setStyle(polyLayer());
        });
        selFeats = [e.target.feature.id];
        selNames = [e.target.feature.properties.NAME];
        selEvents = [e.target];
        e.target.setStyle(polyLayerSelectHover());
        L.DomEvent.stopPropagation(e); // stop click event from being propagated further
      },
      mouseover: function(e) {
        if(selFeats.indexOf(e.target.feature.id) == -1) {
          e.target.setStyle(polyLayerHover());
        }
        else {
          e.target.setStyle(polyLayerSelectHover());
        }
        tooltip.style("top", (e.originalEvent.pageY-50) + "px").style("left", (e.originalEvent.pageX) + "px");
        showIt(e.target.feature.properties.NAME);
      },
      mouseout: function(e) {
        if(selFeats.indexOf(e.target.feature.id) == -1) {
          e.target.setStyle(polyLayer());
        }
        else {
          e.target.setStyle(polyLayerSelect());
        }
        tooltip.style("visibility", "hidden");
      }
    });
  }


  var opaVar = [land_cover, imp_sur, imp_descr, tree_can, elevation, solar_rad_180, consec_years, NF, counties, huc8, huc10, huc12, streams, lakes];
  infoObj = {"land_cover_2016": "Land Cover", "impervious_2016": "Impervious Surface", "impervious_descr_2016": "Impervious Descriptor", "tree_canopy_2016": "Tree Canopy", "elevation_30m": "Elevation", "solar_rad_30m_180": "Solar Gain", "consec_years_detected_clipped": "Consec. Years Pest Damage", "s_usa_administrativeforest_mi_wgs84": "National Forest", "cb_2018_us_county_500k_mi_wgs84": "Counties", "wbdhu8_mi": "HUC-8", "wbdhu10_mi": "HUC-10", "wbdhu12_mi": "HUC-12", "nhd24k_mi_lake_erase_no_coast": "NHD Streams", "nhdwaterbody_lakes": "NHD Lakes"};
  infoIDField = {"land_cover_2016": "PALETTE_INDEX", "impervious_2016": "PALETTE_INDEX", "impervious_descr_2016": "PALETTE_INDEX", "tree_canopy_2016": "GRAY_INDEX", "elevation_30m": "GRAY_INDEX", "solar_rad_30m_180": "GRAY_INDEX", "consec_years_detected_clipped": "GRAY_INDEX", "s_usa_administrativeforest_mi_wgs84": "forestname", "cb_2018_us_county_500k_mi_wgs84": "name", "wbdhu8_mi": "name", "wbdhu10_mi": "name", "wbdhu12_mi": "name", "nhd24k_mi_lake_erase_no_coast": "gnis_name", "nhdwaterbody_lakes": "gnis_name"};
  infoDataType = {"land_cover_2016": "raster", "impervious_2016": "raster", "impervious_descr_2016": "raster", "tree_canopy_2016": "raster", "elevation_30m": "raster", "solar_rad_30m_180": "raster", "consec_years_detected_clipped": "raster", "s_usa_administrativeforest_mi_wgs84": "polygon", "cb_2018_us_county_500k_mi_wgs84": "polygon", "wbdhu8_mi": "polygon", "wbdhu10_mi": "polygon", "wbdhu12_mi": "polygon", "nhd24k_mi_lake_erase_no_coast": "line", "nhdwaterbody_lakes": "polygon"};
  queryIDField = {"s_usa_administrativeforest_mi_wgs84": "forestorgc", "cb_2018_us_county_500k_mi_wgs84": "geoid", "wbdhu8_mi": "huc8", "wbdhu10_mi": "huc10", "wbdhu12_mi": "huc12"};
  var overlayID = d3.keys(infoObj);
  var baselayers = {"Google Terrain": googleTerrain, "Google Hybrid": googleHybrid, "Google Satellite": googleSatellite, "Google Street": googleStreet, "Bing Hybrid": bingHybrid, "Bing Satellite": bingSatellite, "Bing Street": bingStreet, "USGS Topo": usgsTopo, "None": blank};
  var overlays = {"Land Cover": land_cover, "Impervious Surface": imp_sur, "Impervious Descriptor": imp_descr, "Tree Canopy": tree_can, "Elevation": elevation, "Solar Gain": solar_rad_180, "Consec. Years Pest Damage": consec_years, "National Forest": NF, "Counties": counties, "HUC-8": huc8, "HUC-10": huc10, "HUC-12": huc12, "NHD Streams (1:24k)": streams, "NHD Lakes": lakes};
  var overlayTitles = d3.keys(overlays);

  //******Make layer controller
  //***baselayers
  var layerNames = {};
  layerNames.baseLayers = baselayers; //{"Google Terrain": googleTerrain, "Google Hybrid": googleHybrid, "Google Satellite": googleSatellite, "Google Street": googleStreet, "None": blank};
  layerNames.baseLayers.keys = d3.keys(layerNames.baseLayers);
  layerNames.baseLayers.values = d3.values(layerNames.baseLayers);


  //***Overlay layers
  layerNames.overlays = {};
  overlayTitles.forEach(function(tmpTitle,i) {
    layerNames.overlays[tmpTitle] = opaVar[i];
  });
  layerNames.overlays.keys = d3.keys(overlays);
  layerNames.overlays.values = d3.values(overlays);



  d3.select("#headerControls")
    .insert("div", ":first-child")
    .attr("id", "mapTools")
    .append("div")
    .attr("id", "baselayerSelect")
    .attr("class", "layerList")
    .append("div")
    .attr("id", "baselayerList")
    .attr("class", "cl_select")
    .property("title", "Click to change map baselayer")
    .html('<span id="baselayerListHeader">Change Baselayer</span><span class="fa fa-caret-down pull-right" style="position:relative;top:3px;"></span>')
    .on("click", function() { if(d3.select("#baselayerListDropdown").style("display") == "none") {d3.select("#baselayerListDropdown").style("display", "inline-block");} else {d3.select("#baselayerListDropdown").style("display", "none");} });;

  d3.select("#baselayerSelect")
    .append("div")
    .attr("id", "baselayerListDropdown")
    .attr("class", "layerListDropdown")
    .on("mouseleave", function() { d3.select(this).style("display", "none") });

  //******Add baselayer options
  d3.select("#baselayerListDropdown").selectAll("div")
    .data(layerNames.baseLayers.keys)
    .enter()
      .append("div")
      .attr("class", "layerName")
      .text(function(d) { return d; })
      .property("value", function(d,i) { return i; })
      .property("title", function(d) { return d; })
      .on("click", function() { changeBaselayer(this); })
      .append("span")
      .attr("class", "fa fa-check pull-right activeOverlay")
      .style("visibility", function(d,i) { if(i == 6) {return "visible";} else {return "hidden";} });

  //******Initialize baselayer
  map.addLayer(bingStreet);
  map.addLayer(background);

  //******Function to change baselayer on select change
  function changeBaselayer(tmpDiv) {
    //***Remove old layer
    var layerDivs = d3.select("#baselayerListDropdown").selectAll("div");
      
    layerDivs._groups[0].forEach(function(tmpLayer) {
      if(d3.select(tmpLayer).select("span").style("visibility") == "visible") {
        d3.select(tmpLayer).select("span").style("visibility", "hidden");
        map.removeLayer(layerNames.baseLayers.values[d3.select(tmpLayer).property("value")]);
      }
    });

    //***Add new layer
    d3.select(tmpDiv).select("span").style("visibility", "visible");
    map.addLayer(layerNames.baseLayers.values[tmpDiv.value]);
    layerNames.baseLayers.values[tmpDiv.value].bringToBack();       
  }



  //***Overlay layers
  d3.select("#mapTools")
    .append("div")
    .attr("id", "overlaySelect")
    .attr("class", "layerList")
    .append("div")
    .attr("id", "overlayList")
    .attr("class", "cl_select")
    .property("title", "Click to select overlay layers to display on map")
    .html('<span id="overlayListHeader">View Overlay Layers</span><span class="fa fa-caret-down pull-right" style="position:relative;top:3px;"></span>')
    .on("click", function() { if(d3.select("#overlayListDropdown").style("display") == "none") {d3.select("#overlayListDropdown").style("display", "inline-block");} else {d3.select("#overlayListDropdown").style("display", "none");} });;
   d3.select("#overlaySelect")
    .append("div")
    .attr("id", "overlayListDropdown")
    .attr("class", "layerListDropdown")
    .on("mouseleave", function() { d3.select(this).style("display", "none") });

  //******Add overlay options
  d3.select("#overlayListDropdown").selectAll("div")
    .data(layerNames.overlays.keys)
    .enter()
      .append("div")
      .attr("id", function(d,i) { return "layerToggleDiv" + i; })
      .attr("class", "layerName")
      .text(function(d) { return d; })
      .property("value", function(d,i) { return i; })
      .property("title", function(d) { return d; })
      .property("name", function(d,i) { return overlayID[i]; })
      .on("click", function() { changeOverlay(this); })
      .append("span")
      .attr("class", "fa fa-check pull-right activeOverlay")
      .style("visibility", "hidden"); //function(d) { if(d == "US States") { map.addLayer(states); return "visible"; } else { return "hidden"; } });

  //******Function to add/remove overlay layer
  function changeOverlay(tmpDiv) {
    if(d3.select(tmpDiv).select("span").style("visibility") == "hidden") {
      d3.select(tmpDiv).select("span").style("visibility", "visible");
      map.addLayer(layerNames.overlays.values[tmpDiv.value]);
      layerNames.overlays.values[tmpDiv.value].bringToFront();
      addLegendImg(tmpDiv.name, tmpDiv.title, layerNames.overlays.values[tmpDiv.value], ["overlays",tmpDiv.title]);
      rpccr_layer.forEach(function(tmp, i) { tmp.bringToFront(); });
    } 
    else {
      d3.select(tmpDiv).select("span").style("visibility", "hidden");
      map.removeLayer(layerNames.overlays.values[tmpDiv.value]);
      remLegendImg(tmpDiv.name);
    }
  }




  //Add panel icons
  d3.select("#headerControls")
    .append("div")
    .attr("id", "panelTools");

  var hcPanels = ["legend" ,"info", "plant", "locate", "extent"];
  var hcGlyphs = ["fa-th-list", "fa-info", "fa-tree", "fa-search", "fa-globe"];
  var hcLabel = ["Legend", "Identify", "Planting", "Locate", "Zoom"]
  d3.select("#panelTools").selectAll("divs")
    .data(hcPanels)
    .enter()
      .append("div")
      .attr("id", function(d) { return "hc" + d.charAt(0).toUpperCase() + d.slice(1) + "Div"; })
      .attr("class", function(d) { if(d != "select") { return "hcPanelDivs layerList"; } else { return "hcPanelDivs layerList disabled"; } })
      .property("title", function(d,i) {
        if(d == "extent") {
          return "Click to zoom to initial extent";
        }
        else {
          return "Click to show " + hcLabel[i] + " window"; 
        }
      })
      .html(function(d,i) { if(d != "search") { return '<span class="fa ' + hcGlyphs[i] + '"></span>'; } else { return '<span class="fa ' + hcGlyphs[i] + '" data-toggle="collapse" data-target="#bingGeoLocate"></span>'; } })
      .on("click", function(d) { 
        switch (d) {
          case "extent":
            map.fitBounds([[41.5,-91],[47.9,-82]]);
            break;
          default:
            toolWindowToggle(d);
            break;
        }
      });


  //******Function to toggle tool windows
  var toggleWords = {"legend":"Legend", "info":"Identify", "locate": "Locate", "plant": "Planting", "download": "Download"}
  toolWindowToggle = function (tmpDiv) {
    if (d3.select("#" + tmpDiv + "Div").style("opacity") == "1") {
      d3.select("#" + tmpDiv + "Div").transition().style("opacity", "0").style("visibility", "hidden");
      d3.select("#hc" + tmpDiv.charAt(0).toUpperCase() + tmpDiv.slice(1) + "Div").property("title", "Click to show " + toggleWords[tmpDiv] + " window");
    }
    else {
      d3.select("#" + tmpDiv + "Div").transition().duration(250).ease(d3.easeCubic).style("opacity", "1").style("display", "block").style("visibility", "visible").on("end", resizePanels);            
      d3.select("#hc" + tmpDiv.charAt(0).toUpperCase() + tmpDiv.slice(1) + "Div").property("title", "Click to hide " + toggleWords[tmpDiv] + " window");
      setZ(d3.select("#" + tmpDiv + "Div")._groups[0][0]);
    }
  }


  function setZ(tmpWin) {
    if (d3.select("#map").classed("introjs-showElement") == false) {
      d3.selectAll("#legendDiv,#infoDiv,#locateDiv,#plantDiv,#downloadDiv").style("z-index", function() { if(d3.select(this).style("opacity") == 1) {return 1001;} else {return 7500;} }); 
      d3.select(tmpWin).style("z-index", 1002);
    }
  }

    




  //******Make tooltip for displaying attribute data
  tooltip = d3.select("body")
    .append("div")
    .attr("id", "d3Tooltip")
    .attr("class", "d3Tooltip");







  //******Make div for planting location window
  d3.select("body")
    .append("div")
    .attr("class", "legend gradDown")
    .attr("id", "plantDiv");

  $('#plantDiv').draggable({containment: "html", cancel: ".toggle-group,input,textarea,button,select,option"});

  d3.select("#plantDiv")
    .append("h4")
    .text("Planting Locations")
    .attr("class", "legTitle")
    .attr("id", "plantTitle")
    .append("span")
    .html('<span class="fa fa-info-circle" data-toggle="tooltip" data-container="body" data-placement="auto" data-html="true" title="<p><u><b>Planting Sites</b></u></p><p>Set restriction boundaries and specify search criteria to locate potential riparian planting sites.</p>"</span>');
 
  d3.select("#plantTitle")
    .html(d3.select("#plantTitle").html() + '<div class="exitDiv"><span id="hidePlant" class="fa fa-times-circle" data-toggle="tooltip" data-container="body" data-placement="auto" data-html="true" title="<p>Click to hide window</p>"</span></div>'); 

  d3.select("#hidePlant")
    .on("click", function() { toolWindowToggle("plant"); });

  d3.select("#plantDiv")
    .append("div")
    .attr("id", "plantCritDiv")
    .html(''
      + '<div id="featSelDiv">'
        + '<label>Area Selection</label>'
        + '<select id="featSel" class="filterAttrList" title="Click to display a boundary layer and choose polygon features for area restriction"></select><span id="featSelReset" class="fa fa-refresh" title="Reset Area Selection layer"></span>'
      + '</div>'
      + '<hr id="plantHR">'
      + '<div id="critSpecDiv">'
        + '<h5>Query Criteria<span class="fa fa-info-circle"  data-toggle="tooltip" data-container="body" data-placement="auto" data-html="true" title="<p><u><b>Query Criteria</b></u></p><p>Select a layer and operator, specify a value, and click the \'Add\' button to create a criterion.<br>Values for each raster layer should conform to the following:<ul><li><b>Land Cover:</b> Sixteen integers between 11 and 95 (view the \'Legend\' window for value categories)</li><li><b>Impervious Surface:</b> An integer between 0 and 100 percent</li><li><b>Tree Canopy:</b> An integer between 0 and 100 percent</li><li><b>Elevation:</b> An integer between 114 and 603 meters</li><li><b>Solar Gain:</b> An integer between 0 and 100 percent (see \'About\' window for details)</li><li><b>Consec. Years Pest Damage:</b> An integer between 0 and 6</li></ul></p>"></span></h5>'
        + '<div id="critOptsDiv">'
          + '<form id="critForm" action="javascript:;" onsubmit="addCrit(this)">'
            + '<label>Layer: </label>'
            + '<select id="critLayerSel" class="filterAttrList" name="critLayer" title="Select a layer for adding a location restriction criteria to the search query" required></select>'
            + '<br>'
            + '<label>Operator: </label>'
            + '<select id="critOpSel" class="filterAttrList" name="critOp" title="Select an operator to add to the location restriction criteria" required></select>'
            + '<br>'
            + '<label>Value: </label>'
            + '<input type="number" id="critValInp" class="filterAttrList" name="critVal" min="0" title="Specify a value to add to the location restriction criteria" required></input>'
            + '<br>'
            + '<div id="critButDiv">'
              + '<button type="submit" id="critBut" class="formBut btn btn-primary" title="Click to add criteria to the location search query"><span class="fa fa-list"></span> Add</button>'
            + '</div>'
          + '</form>'
        + '</div>'
        + '<div id="critAddedDiv">'
          + '<div id="runDiv">'
            + '<button id="runBut" class="formBut btn btn-primary" title="Click to run the location search query"><span class="fa fa-arrow-circle-right"></span> Run</button>'
          + '<div>'
        + '</div>'
        + '<div id="progBarDiv" class="progress">'
          + '<div id="progBar" class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width:0%">0%</div>'
        + '</div>'
      + '</div>'
    );

  d3.select("#featSelReset").on("click", function() { d3.select("#featSel").property("selectedIndex", 0); changeFeatSel(); });
  d3.select("#runBut").on("click", function() { runQuery(); });

  var featLayers = ["Select Layer...", "National Forest", "Counties", "HUC 8 Watersheds", "HUC 10 Watersheds", "HUC 12 Watersheds"];
  var pgFeatLayerNames = [null, "s_usa_administrativeforest_mi_wgs84", "cb_2018_us_county_500k_mi_wgs84", "wbdhu8_mi", "wbdhu10_mi", "wbdhu12_mi"];
  var gjCur = 0;
  gjCurName = "";
  var gjFeats = [];

  var tmpSel = d3.select("#featSel")
    .on("change", function() { changeFeatSel(); });

  function changeFeatSel() {
    selFeats.forEach(function(id, i) {
      selEvents[i].setStyle(polyLayer());
    });
    selFeats = [];
    selNames = [];
    selEvents = [];

    if(gjCur != 0) {
      map.removeLayer(gjLayers[gjCur]); 
      d3.select("#d3Tooltip").style("visibility", "hidden");
    }
    gjCur = d3.select("#featSel").property("selectedIndex");
    gjCurName = pgFeatLayerNames[gjCur];
    if(gjCur != 0) {
      map.addLayer(gjLayers[gjCur]); 
    }
  }

  tmpSel.selectAll("option")
    .data(featLayers)
    .enter()
      .append("option")
      .attr("value", function(d,i) { return pgFeatLayerNames[i]; })
      .attr("data-i", function(d,i) { return i; })
      .property("disabled", function(d, i) { if(i==0) {return "disabled";} })
      .text(function(d,i) { return featLayers[i]; });


  var critLayers = ["", "Land Cover", "Impervious Surface", "Tree Canopy", "Elevation", "Solar Gain", "Consec. Years Pest Damage"];
  critUsed = [];

  tmpSel = d3.select("#critLayerSel")
    .on("change", function() { });

  tmpSel.selectAll("option")
    .data(critLayers)
    .enter()
      .append("option")
      .attr("value", function(d) { return d; })
      //.property("disabled", function(d, i) { if(i==0) {return "disabled";} })
      .text(function(d,i) { return critLayers[i]; });

  var opTitle = ["", "Equal to", "Not equal to", "Less than", "Less than or equal to", "Greater than", "Greater than or equal to"];
  d3.select("#critOpSel").selectAll("option")
    .data(["", "=", "!=", "<", "<=", ">", ">="])
    .enter()
      .append("option")
      .attr("value", function(d) { return d; })
      .property("title", function(d, i) { return opTitle[i]; })
      .text(function(d) { return d; });

  //***Add in RPCCR results to plantDiv
  d3.select("#plantDiv")
    .append("div")
    .attr("id", "resultsDiv")
    .html('<h5 class="legTitle">Results<span class="fa fa-info-circle" data-toggle="tooltip" data-container="body" data-placement="auto" data-html="true" title="<p><u><b>Planting Site Results</b></u></p><p>List of planting location result layers for viewing, comparing, and downloading.</p>"</span></h5><div id="resLeg"><p><span class="fa fa-square" style="color:#000000;margin:0;"></span> = Meets (101)<span class="fa fa-square" style="color:#33bbff;margin-left:10px;"></span> = Fails (100)</p></div><div id="rpccrDiv"></div>');
 




  //******Make div for info
  d3.select("body")
    .append("div")
    .attr("class", "legend gradDown")
    .attr("id", "infoDiv");

  $('#infoDiv').draggable({containment: "html", cancel: ".toggle-group,input,textarea,button,select,option"});

  d3.select("#infoDiv")
    .append("h4")
    .text("Identify")
    .attr("class", "legTitle")
    .attr("id", "infoTitle")
    .append("span")
    .html('<span class="fa fa-info-circle" data-toggle="tooltip" data-container="body" data-placement="auto" data-html="true" title="<p><u><b>Identify</b></u></p><p>Displays attribute value for visible overlay layers for a clicked point on the map</p>"</span>');
 
  d3.select("#infoTitle")
    .html(d3.select("#infoTitle").html() + '<div class="exitDiv"><span id="hideInfo" class="fa fa-times-circle" data-toggle="tooltip" data-container="body" data-placement="auto" data-html="true" title="<p>Click to hide window</p>"</span></div>'); 

  d3.select("#hideInfo")
    .on("click", function() { toolWindowToggle("info"); });

  d3.select("#infoDiv")
    .append("div")
    .attr("id", "info");




  //******Make div for download
  d3.select("body")
    .append("div")
    .attr("class", "legend gradDown")
    .attr("id", "downloadDiv");

  $('#downloadDiv').draggable({containment: "html", cancel: ".toggle-group,input,textarea,button,select,option"});

  d3.select("#downloadDiv")
    .append("h4")
    .text("Download")
    .attr("class", "legTitle")
    .attr("id", "downloadTitle")
    .append("span")
    .html('<span class="fa fa-info-circle" data-toggle="tooltip" data-container="body" data-placement="auto" data-html="true" title="<p><u><b>Download</b></u></p><p>Download data for the current set of filtered locations as either a CSV or geoJSON (spatial files only) file.<br><br>NOTE: Queries for large numbers of sample locations and/or for raw data may take an extended time, but will appear in the bottom of this window for download once complete.</p>"</span>');
 
  d3.select("#downloadTitle")
    .html(d3.select("#downloadTitle").html() + '<div class="exitDiv"><span id="hideDownload" class="fa fa-times-circle" data-toggle="tooltip" data-container="body" data-placement="auto" data-html="true" title="<p>Click to hide window</p>"</span></div>'); 

  d3.select("#hideDownload")
    .on("click", function() { toolWindowToggle("download"); });

  d3.select("#downloadDiv")
    .append("div")
    .attr("id", "download")
    .append("div")
    .html('<h6 class="filterHeader">File Format</h6><select id="downloadSelect" class="cl_select"><option>CSV</option><option>geoJSON</option></select><hr><h6 class="filterHeader">Output Tables</h6><div id="downloadChkDiv"><input type="checkbox" id="chkIndicators" class="downloadChk" checked>Indicator Data</input><br><input type="checkbox" id="chkSpecies" class="downloadChk">Species Data</input><br><input type="checkbox" id="chkRaw" class="downloadChk">Raw Data</input></div><hr>');

  d3.select("#download")
    .append("div")
    .attr("id", "downloadButton")
    .attr("class", "ldcButton")
    .text("Proceed")
    .property("title", "Click to initiate queries for selected data")
    .on("click", function() { downloadData(); });

  d3.select("#download")
    .append("div")
    .attr("id", "downloadLinks")
    .html('<img id="downloadGif" class="disabled" src="images/processing.gif"></img>');






  //******Add description to info tooltip
  d3.select("#info")
    .append("p")
    .attr("id", "infoP");







  //******Make div for legend
  d3.select("body")
    .append("div")
    .attr("class", "legend gradDown")
    .attr("id", "legendDiv");

  $('#legendDiv').draggable({containment: "html", cancel: ".toggle-group,.layerLegend,textarea,button,select,option"});

  d3.select("#legendDiv")
    .append("h4")
    .text("Legend")
    .attr("class", "legTitle")
    .attr("id", "legendTitle")
    .append("span")
    .html('<span class="fa fa-info-circle" data-toggle="tooltip" data-container="body" data-placement="auto" data-html="true" title="<p><u><b>Legend</b></u></p><p>Displays legends for added map layers enabling their interpretation along with control over their transparency.<br><br>Drag and drop layers to change their order on the map.</p>"</span>');
 
  d3.select("#legendTitle")
    .html(d3.select("#legendTitle").html() + '<div class="exitDiv"><span id="hideLegend" class="fa fa-times-circle" data-toggle="tooltip" data-container="body" data-placement="auto" data-html="true" title="<p>Click to hide window</p>"</span></div>'); 

  d3.select("#hideLegend")
    .on("click", function() { toolWindowToggle("legend"); });

  d3.select("#legendDiv")
    .append("div")
    .attr("id", "legendDefault")
    .text("Add a map layer to view its legend...");

  d3.select("#legendDiv")
    .append("div")
    .attr("id", "legendImgDiv");

    $("#legendImgDiv").sortable({appendTo: "#legendImgDiv", containment: "#legendImgDiv", cancel: "input,textarea,button,select,option", forcePlaceholderSize: true, placeholder: "sortable-placeholder", helper: "original", tolerance: "pointer", stop: function(event, ui) { reorder(event, ui); }, start: function(event, ui) { helperPlaceholder(event, ui); }});


  //******Change the layer orders after drag and drop
  function reorder(tmpEvent, tmpUI) {
     var tmpCnt = tmpEvent.target.children.length;
     var i = 0
     for (let child of tmpEvent.target.children) {
       overlays[infoObj[child.id.slice(0,-6)]].setZIndex(tmpCnt - i);
       i += 1;
     }
  }

  //******Style the helper and placeholder when dragging/sorting
  function helperPlaceholder(tmpEvent, tmpUI) {
    //console.log(tmpUI); 
    d3.select(".ui-sortable-placeholder.sortable-placeholder").style("width", d3.select("#" + tmpUI.item[0].id).style("width")).style("height", "37px");  //.style("background", "rgba(255,255,255,0.25)"); 
  }


  //******Adds images to the legend
  function addLegendImg(tmpName, tmpTitle, tmpLayer, tmpPath) {
    //console.log(tmpName);
    if(tmpName.includes("surf") || tmpName.includes("mlra")) {
      var tmpOpa = 0.6;
    }
    else {
      var tmpOpa = 1;
    }
    tmpLayer.setOpacity(tmpOpa);

    d3.select("#legendImgDiv")
      .insert("div", ":first-child")
      .attr("id", tmpName + "Legend")
      .attr("value", tmpPath)
      .attr("class", "layerLegend")
      .append("div")
      .attr("id", tmpName + "LegendHeader")
      .attr("data-toggle", "collapse")
      .attr("data-target", "#" + tmpName + "collapseDiv")
      .on("click", function() { changeCaret(d3.select(this).select("span")._groups[0][0]); })
      .append("div")
      .attr("class", "legendTitle")
      .html('<h6>' + tmpTitle + '</h6><div class="exitDiv"><span class="fa fa-caret-down legendCollapse" title="View legend"></span></div>');


    function changeCaret(tmpSpan) {
      if(d3.select(tmpSpan).classed("fa-caret-down")) {
        d3.select(tmpSpan).classed("fa-caret-down", false).classed("fa-caret-up", true).property("title", "Hide legend");
      }
      else {
        d3.select(tmpSpan).classed("fa-caret-up", false).classed("fa-caret-down", true).property("title", "View legend");
      }
    }

    d3.select("#" + tmpName + "Legend")
      .append("div")
      .attr("id", tmpName + "collapseDiv")
      .attr("class", "collapseDiv collapse")
      .append("div")
      .attr("id", tmpName + "LegImgDiv")
      .attr("class","legImgDiv")
      .append("img")
      .attr("id", tmpName + "LegendImg")
      .attr("class", "legendImg")
      .property("title", tmpTitle);

    $("#" + tmpName + "collapseDiv").on("shown.bs.collapse", function() { resizePanels(); });
    $("#" + tmpName + "collapseDiv").on("hidden.bs.collapse", function() { resizePanels(); });


    //***Set div width and offset after the image has been loaded
    $("#" + tmpName + "LegendImg").one("load", function() {
      var tmpRect = document.getElementById(tmpName + "LegendImg").getBoundingClientRect();
      d3.select("#" + tmpName + "LegImgDiv").style({"max-height":tmpRect.height - 67 + "px", "max-width": tmpRect.width + "px"});
      d3.select("#" + tmpName + "Legend").style("opacity", "1");     
    }).attr("src", "https://ecosheds.org/geoserver/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=30&HEIGHT=30&LAYER=ottawa:" + tmpName);

    d3.select("#" + tmpName + "collapseDiv")
      .append("div")
      .attr("id", tmpName + "LegendSlider")
      .property("title", tmpTitle + " Layer Opacity: " + tmpOpa * 100 + "%");

    $("#" + tmpName + "LegendSlider").slider({animate: "fast", min: 0, max: 100, value: tmpOpa * 100, slide: function(event, ui) { layerOpacity(ui, tmpLayer); } });

    d3.select("#legendDefault").style("display", "none");

    d3.select("#legendImgDiv")
      .style("display", "block");

    if(d3.select("#legendDiv").style("opacity") == 0) {
      toolWindowToggle("legend");
    }

    resizePanels();
  }


  //******Removes images to the legend
  function remLegendImg(tmpName) {
    d3.select("#" + tmpName + "Legend").remove();

    if(d3.select("#legendImgDiv").selectAll("div")._groups[0].length == 0) {
      d3.select("#legendImgDiv").style("display", "none");
      d3.select("#legendDefault").style("display", "block");
    }
  }


  //******Change transparency of current legend layer
  function layerOpacity(tmpSlider, tmpLayer) {
    var tmpOpacity = tmpSlider.value/100; 
    tmpSlider.title = "Opacity: " + tmpSlider.value + "%"; 
    tmpLayer.setOpacity(tmpOpacity);
  } 




  //******Set z-indexes of moveable divs so that clicked one is always on top
  d3.selectAll("#legendDiv,#infoDiv,#locateDiv,#plantDiv,#downloadDiv")
    .on("mousedown", function() { setZ(this); });










      //*******Make Help/information div
      d3.select("body")
        .append("div")
        .attr("class", "modal fade ui-draggable in")
        .attr("id", "helpDiv")
        .style("display", "none")
        .append("div")
        .attr("class", "modal-dialog modal-lg")
        .attr("id", "aboutDiv")
        .append("div")
        .attr("class", "aboutLegendTitle")
        .text("MI Riparian Planting Prioritization Tool")
        .property("title", "MI Riparian Planting Prioritization Tool informational details")
        .append("span")
        .attr("class", "fa fa-times-circle pull-right minimize-button")
        .attr("data-toggle", "modal")
        .attr("data-target", "#helpDiv")
        .property("title", "Click to close");   
        
      d3.select("#aboutDiv")
        .append("div")
        .attr("id", "helpMenu")
        .html('<ul class="nav nav-pills nav-stacked"><li class="nav-item" id="overview" title="Tool Overview" onclick="changePill(this)"><a class="nav-link active" href="#">Tool<br>Overview</a></li><li class="nav-item" id="usage" title="Performance and Design" onclick="changePill(this)"><a class="nav-link" href="#">Performance and Design</a></li><li class="nav-item" id="sources" title="Data Sources" onclick="changePill(this)"><a class="nav-link" href="#">Data<br>Sources</a></li></ul>');

      d3.select("#aboutDiv")
        .append("div")
        .attr("id", "helpContent")
        .append("div")
        .attr("class", "helpDivs")
        .attr("id", "help-overview")
        .style("display", "inline-block") 
        .html('<h3>Background</h3>'
           + '<p>The MI Riparian Planting Prioritization Tool is a data visualization and decision support tool that was developed to assist with locating and prioritizing tree planting sites that meet user-defined criteria.<br>This tool was designed to assist federal and state agencies, local decision-makers, regional planners, conservation organizations, and natural resource managers using open-source software.</p>'
           //+ '<p>Data for this tool comes from a variety of sources and was developed in partnership with other efforts, including <a href="http://www.umasscaps.org/" target="_blank">CAPS (Conservation Assessment and Prioritization System)</a> and the <a href="https://streamcontinuity.org/" target="_blank">North Atlantic Aquatic Connectivity Collaborative (NAACC)</a>. Thank you to all who provided data, expertise, and feedback for this tool.</p>'
           + '<br>'
           + '<h3>Quick Start</h3>'
           + '<p>Additional information about a tool or an item can be found by hovering over the <span class="fa fa-info-circle" title="A tooltip displaying additional details appears upon hovering over most elements."></span> icon or the object itself to display a tooltip.</p>'
           + '<p><b>Step 1:</b> Open the Planting Locations window by clicking the <span class="fa fa-tree"></span> icon on the top menu.</p>'
           + '<p><b>Step 2:</b> Select a layer to restrict the area of analysis.</p>'
           + '<p><b>Step 3:</b> Select one or more features (e.g. huc or county) by clicking them on the map (selected features turn blue). To remove a selected feature click that feature again. To remove all selections double click any feature.</p>'
           + '<p><b>Step 4:</b> Add one or more query criteria by selecting a layer and an operator, entering a value, and clicking on the "Add" button.<ul style="margin:0;"><li>NOTE: A layer can only be used to specify one criteria.</li></ul></p>'
           + '<p><b>Step 5:</b> Once all criteria have been specified, click the "Run" button to perform the query and display the results.</p>'
           + '<p><b>Step 6:</b> View, compare, and download the query results in the "Results" window that appears upon run completion.</p>'
           + '<br>'
           + '<h3>Analysis details</h3>'
           + '<ul>'
           + '<li><p>Raster layers used for the analysis are composed of 30 m pixels which are restricted to having their centroid be within 100 feet of the NHD 1:24,000 stream layer.</p></li>'
           + '<li><p>The <b>consecutive years pest damage</b> layer was computed using <a href="https://www.fs.fed.us/foresthealth/applied-sciences/mapping-reporting/detection-surveys.shtml" title="https://www.fs.fed.us/foresthealth/applied-sciences/mapping-reporting/detection-surveys.shtml" target="_blank">Forest Service Insect & Disease Detection Survey (IDS)</a> data from 2014 through 2019. A map algebra expression evaluated backwards in time whether a pixel was surveyed, and if so if it was classified as damaged. The first year where a pixel was surveyed and undamaged returned the number of previous years of consecutive damage.<ul><li>Unsurveyed pixels for 2019 were assumed to be damaged if the prior surveyed year was classified as damaged.</li><li>Pixels classified as damaged in 2019 with subsequent unsurveyed years were assumed to be damaged until an undamaged classification was encountered.</li></ul></p></li>' 
           + '<li><p>The <b>solar gain</b> layer was computed using the <a href="https://grass.osgeo.org/grass78/manuals/r.sun.html" title="https://grass.osgeo.org/grass78/manuals/r.sun.html" target="_blank">r.sun</a> module within <a href="https://grass.osgeo.org/" title="https://grass.osgeo.org/" target="_blank">GRASS GIS 7.8.2</a>. For the r.sun module, in addition to elevation, both aspect and slope were used after being derived from the 30m National Elevation Dataset raster using <a href="https://desktop.arcgis.com/en/arcmap/" title="https://desktop.arcgis.com/en/arcmap/" target="_blank">ArcMap 10.7</a>. The irradiance/irradiation model was set to total (glob_rad), and the day of year was set to 180 (June 28th).</p></li>'
           + '<li><p>When creating an analysis criteria using the solar gain layer, a percent value between 0 and 100 should be specified. This value is used by the analysis to determine the raw data value by performing the following steps:<ul><li>Acquiring all raw solar gain values within the 100 foot stream buffer that are contained by the selected area features.</li><li>Sorting the acquired raw values by ascending value and returning the value of the item in the list located at the specified percentage.</li></ul></p></li>'
           + '<li><p>The raster layer produced by the analysis is a temporary file stored on the server that will be deleted once the user leaves the website. Since it is a temporary file, the naming convention used for tracking each result layer uses the name of the area selection layer (e.g HUC-12), and the time in seconds since midnight Eastern time (e.g. 9:00 AM = 32400).</p></li>'
           + '</ul>'
           + '<br>'
           + '<h3>Tool Development Team</h3>'
           + '<ul>'
             + '<li><p>Jason Coombs</p></li>'
             + '<li><p>Keith Nislow</p></li>'
           + '</ul>'
           + '<p>Questions or comments should be directed to Jason Coombs at <a href="mailto:jcoombs@umass.edu">jcoombs@umass.edu</a>.</p>'
         );

      d3.select("#helpContent")
        .append("div")
        .attr("class", "helpDivs")
        .attr("id", "help-usage")
        .html('<h3>Overview</h3>'
           + '<p> The MI Riparian Planting Prioritization Tool presents users with a means to query, view, and download potential locations for tree plantings through an intuitive browser-based mapping interface.</p>'
           + '<br>'
           + '<h3>Optimal Performance Requirements</h3>'
           + '<p>The tool is currently supported on the latest versions of all major web browsers, however, <a target="_blank" href="https://www.google.com/chrome/">Google Chrome</a> is highly recommended for the best user experience. The tool is not intended for use on mobile devices, and is a memory-intensive application. Older computers may have difficulty rendering the interface resulting in sluggish performance. If you run into issues, we recommend closing all other programs and browser tabs to increase available memory.</p>'
           + '<br>'
           + '<h3>Design and Implementation</h3>'
           //+ '<p>In order to achieve feature filtering in a highly responsive way, SCE was developed as a client-side web application, which means all computations are performed within the user&apos;s web browser (as opposed to remotely on the web server). The application is comprised of two primary components:</p>'
           //+ '<ul>'
           //  + '<li><p><b>Analytics Engine:</b> The <a href="http://square.github.io/crossfilter/" target="_blank">crossfilter.js</a> library provides an extremely fast computational engine that can filter and aggregate large multi-variate datasets in near-real time and all within the user&apos;s web browser.</p></li>'
           //  + '<li><p><b>Visualization Platform:</b> The <a href="https://d3js.org/" target="_blank">d3.js</a> library is a powerful toolkit for developing interactive visualizations such as charts and maps that can respond to user inputs such as clicking and dragging, and update with great speed and efficiency.</p></li>'
           //+ '</ul>'
           //+ '<h3>Software Libraries</h3>'
           + '<p>The following open-source software libraries were used to create the MI Riparian Planting Prioritization Tool:</p>'
           + '<ul>'
             + '<li><p><b><a href="https://nodejs.org/en/" target="_blank">Node.js</a>:</b> Web server runtime environment</p></li>'
             + '<li><p><b><a href="https://expressjs.com/" target="_blank">Express</a>:</b> Web server framework and API</p></li>'
             + '<li><p><b><a href="http://leafletjs.com/" target="_blank">Leaflet</a>:</b> Interactive map framework</p></li>'
             + '<li><p><b><a href="https://github.com/topojson/topojson" target="_blank">Topojson.js</a>:</b> Geospatial data format</p></li>'
             + '<li><p><b><a href="https://d3js.org/" target="_blank">D3.js</a>:</b> Data visualization, mapping and interaction</p></li>'
             + '<li><p><b><a href="https://introjs.com/" target="_blank">Intro.js</a>:</b> Guide and feature introduction</p></li>'
             + '<li><p><b><a href="http://getbootstrap.com/" target="_blank">Bootstrap</a>:</b> Front-end framework and styling</p></li>'
             + '<li><p><b><a href="https://jquery.com/" target="_blank">jQuery.js</a>:</b> JavaScript library</p></li>'
             //+ '<li><p><b><a href="https://github.com/d3/d3-queue" target="_blank">Queue.js</a>:</b> Asynchronous dataset and file retrieval</p></li>'
             //+ '<li><p><b><a href="http://colorbrewer2.org/" target="_blank">ColorBrewer</a>:</b> Pre-defined color palettes</p></li>'
           + '</ul>'
           + '<br>'
           + '<h3>Future Work and Contact Info</h3>'
           + '<p>Development of this tool is currently ongoing and future updates may include additional area restriction polygons and criteria selection rasters. If you have any questions, encounter any errors, or are interested in applying this tool to your region, please contact Jason Coombs at <a href="mailto:jcoombs@umass.edu">jcoombs@umass.edu</a>.</p>'
           + '<br>'
           + '<h3>Tool Version</h3>'
           + '<p>v1.0.0 - 09-01-2020</p>'
           + '<ul><li><p>Initial release</p></li></ul>'
         );

/*
      d3.select("#helpContent")
        .append("div")
        .attr("class", "helpDivs")
        .attr("id", "help-videos")
        .html('' //<p style="background:red;color:white;"><u>NOTICE:</u> Videos were recorded on the previous version of the app and will be updated soon.</p>'
           + '<h3>Tool Overview</h3>'
           + '<div class="videoDiv">'
             + '<video id="video1" class="htmlVideo" controls preload="auto" poster="images/sce_overview.jpg">'
               + '<source src="video/sce_overview.mp4" type="video/mp4">'
               + 'Your browser does not support HTML5 video.'
             + '</video>'
           + '</div>'

           + '<h3>Filters & Spatial Joins</h3>'
           + '<div class="videoDiv">'
             + '<video id="video2" class="htmlVideo" controls preload="auto" poster="images/sce_filtering.jpg">'
               + '<source src="video/sce_filtering.mp4" type="video/mp4">'
               + 'Your browser does not support HTML5 video.'
             + '</video>'
           + '</div>'

           + '<h3>Case Study Example</h3>'
           + '<div class="videoDiv">'
             + '<video id="video3" class="htmlVideo" controls preload="auto" poster="images/sce_scenario.jpg">'
               + '<source src="video/sce_scenario.mp4" type="video/mp4">'
               + 'Your browser does not support HTML5 video.'
             + '</video>'
           + '</div>'
         );       
*/

      d3.select("#helpContent")
        .append("div")
        .attr("class", "helpDivs")
        .attr("id", "help-sources")
        .html('<h3>Datasets</h3>'
          + '<p>A list of sources for raster and polygon layers.</p><br>'
          + '<h4>Raster Layers</h4>'
          + '<table>'
            + '<tr><th>Name</th><th>Source</th><th>Download</th></tr>'
            + '<tr><td>Land Cover (2016)</td><td><a href="https://www.mrlc.gov/data?f%5B0%5D=category%3ALand%20Cover" target="_blank">Multi-Resolution Land Characteristics Consortium</a></td><td><a href="layers/land_cover_2016.zip" target="_blank" title="Click to download"><span class="fa fa-download"></span></a></td></tr>'
            + '<tr><td>Impervious Surface (2016)</td><td><a href="https://www.mrlc.gov/data?f%5B0%5D=category%3AUrban%20Imperviousness" target="_blank">Multi-Resolution Land Characteristics Consortium</a></td><td><a href="layers/impervious_2016.zip" target="_blank" title="Click to download"><span class="fa fa-download"></span></a></td></tr>'
            + '<tr><td>Impervious Descriptor (2016)</td><td><a href="https://www.mrlc.gov/data?f%5B0%5D=category%3AUrban%20Imperviousness" target="_blank">Multi-Resolution Land Characteristics Consortium</a></td><td><a href="layers/impervious_descr_2016.zip" target="_blank" title="Click to download"><span class="fa fa-download"></span></a></td></tr>'
            + '<tr><td>Tree Canopy (2016)</td><td><a href="https://www.mrlc.gov/data?f%5B0%5D=category%3ATree%20Canopy" target="_blank">Multi-Resolution Land Characteristics Consortium</a></td><td><a href="layers/tree_canopy_2016.zip" target="_blank" title="Click to download"><span class="fa fa-download"></span></a></td></tr>'
            + '<tr><td>Elevation</td><td><a href="https://datagateway.nrcs.usda.gov/GDGOrder.aspx" target="_blank">USDA Geospatial Data Gateway</a></td><td><a href="layers/elevation_30m.zip" target="_blank" title="Click to download"><span class="fa fa-download"></span></a></td></tr>'
            + '<tr><td>Solar Gain</td><td><a href="mailto:jcoombs@umass.edu" target="_blank">Jason Coombs</a>, University of Massachusetts Amherst</td><td><a href="layers/solar_rad_30m_180.zip" target="_blank" title="Click to download"><span class="fa fa-download"></span></a></td></tr>'
            + '<tr><td>Consecutive Years Pest Damage</td><td><a href="mailto:jcoombs@umass.edu" target="_blank">Jason Coombs</a>, University of Massachusetts Amherst</td><td><a href="layers/consec_years_pest_damage.zip" target="_blank" title="Click to download"><span class="fa fa-download"></span></a></td></tr>'
          + '</table>'
          + '<br>'
          + '<h4>Polygon Layers</h4>'
          + '<table>'
            + '<tr><th>Name</th><th>Source</th><th>Download</th></tr>'
            + '<tr><td>National Forests</td><td><a href="https://data.fs.usda.gov/geodata/edw/datasets.php" target="_blank">Forest Service Geodata Clearinghouse</a></td><td><a href="layers/national_forests_mi.zip" target="_blank" title="Click to download"><span class="fa fa-download"></span></a></td></tr>'
            + '<tr><td>Counties</td><td><a href="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html" target="_blank">United States Census Bureau</a></td><td><a href="layers/counties_mi.zip" target="_blank" title="Click to download"><span class="fa fa-download"></span></a></td></tr>'
            + '<tr><td>HUC-8</td><td><a href="https://datagateway.nrcs.usda.gov/GDGOrder.aspx" target="_blank">USDA Geospatial Data Gateway</a></td><td><a href="layers/huc_8_mi.zip" target="_blank" title="Click to download"><span class="fa fa-download"></span></a></td></tr>'
            + '<tr><td>HUC-10</td><td><a href="https://datagateway.nrcs.usda.gov/GDGOrder.aspx" target="_blank">USDA Geospatial Data Gateway</a></td><td><a href="layers/huc_10_mi.zip" target="_blank" title="Click to download"><span class="fa fa-download"></span></a></td></tr>'
            + '<tr><td>HUC-12</td><td><a href="https://datagateway.nrcs.usda.gov/GDGOrder.aspx" target="_blank">USDA Geospatial Data Gateway</a></td><td><a href="layers/huc_12_mi.zip" target="_blank" title="Click to download"><span class="fa fa-download"></span></a></td></tr>'
            + '<tr><td>Streams NHD 1:24k</td><td><a href="http://prd-tnm.s3-website-us-west-2.amazonaws.com/?prefix=StagedProducts/Hydrography/NHD/State/HighResolution/GDB/" target="_blank">National Hydrography Dataset</a></td><td><a href="layers/nhd_streams_mi.zip" target="_blank" title="Click to download"><span class="fa fa-download"></span></a></td></tr>'
            + '<tr><td>Lakes</td><td><a href="http://prd-tnm.s3-website-us-west-2.amazonaws.com/?prefix=StagedProducts/Hydrography/NHD/State/HighResolution/GDB/" target="_blank">National Hydrography Dataset</a></td><td><a href="layers/nhd_lakes_mi.zip" target="_blank" title="Click to download"><span class="fa fa-download"></span></a></td></tr>'
          + '</table>'
        );
/*
      d3.select("#helpContent")
        .append("div")
        .attr("class", "helpDivs")
        .attr("id", "help-appendix")
        .html('<h3>Appendix</h3>'
          + '<p>The following tables contain the shortened attribute name used as field headings in shapefile downloads, along with the attribute\'s definition.</p><br>'
          + '<h4>Crossings Layer</h4>'
          + '<table id="app_crossings">'
            + '<tr><th>Attribute</th><th>Shapefile Name</th><th>Definition</th></tr>'
          + '</table>'
          + '<br>'
          + '<h4>Streams Layer</h4>'
          + '<table id="app_streams">'
            + '<tr><th>Attribute</th><th>Shapefile Name</th><th>Definition</th></tr>'
          + '</table>'
          + '<br>'
          + '<h4>Catchments Layer</h4>'
          + '<table id="app_catchments">'
            + '<tr><th>Attribute</th><th>Shapefile Name</th><th>Definition</th></tr>'
          + '</table>');
*/
       d3.select("#aboutDiv")
         .append("div")
         .attr("id", "helpFunding")
         .html('<div id="fundingLeftImg"><a href="https://www.glri.us/" target="_blank"><img id="glri" src="images/glri.jpg" title="Great Lakes Restoration Initiative"></a><a href="https://www.usda.gov/" target="_blank"><img id="usda" src="images/usda.png" title="US Department of Agriculture"></a></div><div id="fundingRightImg"><a href="https://www.fs.usda.gov/" target="_blank"><img id="usfs" src="images/shield_color.png" title="US Forest Service"></a><a href="https://www.umass.edu/" target="_blank"><img id="UMass" src="images/umass_amherst.png" title="University of Massachusetts"></a></div><p id="funders">Principle funding for this tool was contributed by the <a class="fundA" href="https://glri.us/" title="https://glri.us/" target="_blank">Great Lakes Restoration Initiative</a><br><br>Additional support was provided by: <a class="fundA" href="https://www.fs.usda.gov/ottawa" title="https://www.fs.usda.gov/ottawa" target="_blank">US Forest Service: Ottawa National Forest</a> | <a class="fundA" href="https://www.nrs.fs.fed.us/" title="https://www.nrs.fs.fed.us/" target="_blank">US Forest Service: Northern Research Station</a> | <a class="fundA" href="https://www.umass.edu/" title="https://www.umass.edu/" target="_blank">University of Massachusetts, Amherst</a></p>');
         //.html('<div id="fundingLeftImg"><a href="https://www.fs.usda.gov/ottawa" target="_blank"><img id="usfs" src="images/shield_color.png" title="US Forest Service: Ottawa National Forest"></a></div><div id="fundingRightImg"><a href="https://www.umass.edu/" target="_blank"><img id="UMass" src="images/umass_amherst.png" title="University of Massachusetts"></a></div><p id="funders">This project was funded by the <a href="https://www.fs.usda.gov/ottawa" target="_blank">US Forest Service - Ottawa National Forest</a><br><br>Additional support was provided by the <a href="https://www.umass.edu/" target="_blank">University of Massachusetts, Amherst</a>.</p>');


/*
      function stopVideos() {
        d3.selectAll(".htmlVideo")[0].forEach(function(d) {
          d.pause();
        });
      }
*/
















  map.addEventListener("click", getInfo);

  function getInfo(e) {
    //console.log(e.latlng.lat.toFixed(3) + ", " + e.latlng.lng.toFixed(3));
    var i = -1;
    var tmpLayers = "";
    var visLayers = [];
    map.eachLayer(function(layer) { 
      i += 1;
      //***Exclude baselayer and points layer
      if(typeof layer.options.layers != "undefined" && layer.options.layers.includes("bbox_mi") == false) {
        if(tmpLayers == "") {
          tmpLayers = layer.options.layers;
        }
        else {
          tmpLayers = layer.options.layers + "," + tmpLayers;
        }
        var tmpName = layer.options.layers.split(":")[1];
        if(infoDataType[tmpName] == "raster") {
          visLayers.splice(0,0,tmpName);
        }
      }
    });

    var bbox = map.getBounds(); //.toBBoxString();
    var tmpStr = bbox._southWest.lat + "," + bbox._southWest.lng + "," + bbox._northEast.lat + "," + bbox._northEast.lng;
    var tmpWidth = map.getSize().x;
    var tmpHeight = map.getSize().y;
    var tmpI = map.layerPointToContainerPoint(e.layerPoint).x;
    var tmpJ = map.layerPointToContainerPoint(e.layerPoint).y;

    var tmpUrl = 'https://ecosheds.org/geoserver/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=' + tmpLayers + '&QUERY_LAYERS=' + tmpLayers + '&BBOX=' + tmpStr + '&FEATURE_COUNT=' + (i * 5) + '&HEIGHT=' + tmpHeight + '&WIDTH=' + tmpWidth + '&INFO_FORMAT=application/json&CRS=EPSG:4326&i=' + tmpI + '&j=' + tmpJ;
    //console.log(tmpUrl);

    //send the request using jQuery $.ajax
    $.ajax({
      url: tmpUrl,
      dataType: "json",
      type: "GET",
      success: function(data) {
        //console.log(visLayers);
        var j = 0;
        var tmpText = "";
        data.features.forEach(function(tmpFeat) {
          var tmpID = tmpFeat.id.split(".")[0];
          if(tmpID != "") {
            addInfo(tmpID, tmpFeat.properties[infoIDField[tmpID]]);
          }
          else if(tmpID == "") {
            if(typeof tmpFeat.properties.PALETTE_INDEX !== "undefined") {
              var tmpObj = "PALETTE_INDEX";
            }
            else if(typeof tmpFeat.properties.GRAY_INDEX !== "undefined") {
              var tmpObj = "GRAY_INDEX";
            }
            else {
              var tmpObj = "NULL";
            }
            addInfo(visLayers[j], Math.round(tmpFeat.properties[tmpObj]));
            j += 1;
          }
          else {
            addInfo(tmpID, "");
          }
        });
        d3.select("#infoP").text(tmpText);
        if(d3.select("#infoDiv").style("opacity") == 0) { toolWindowToggle("info"); }
        resizePanels();

        function addInfo(tmpId, tmpInfo) {
          if(tmpText == "") {
            tmpText = infoObj[tmpId] + ": " + tmpInfo;
          }
          else {
            tmpText += "\n" + infoObj[tmpId] + ": " + tmpInfo;
          }
        }
      }
    });
  }

  startIntro();
}


function changePill(tmpID) {
  d3.select("#helpMenu").selectAll("a").classed("active", false);
  d3.select(tmpID).select("a").classed("active", true);
  d3.selectAll(".helpDivs").style("display", "none");
  d3.select("#help-" + tmpID.id).style("display", "inline-block");
  //if(d3.select("#help-videos").style("display") != "inline-block") {
    //stopVideos();
  //}
}



//*******Show crossings attribute in tooltip
function showIt(tmpID) {
  tooltip.text(tmpID);
  tooltip.style("visibility", "visible");
  tooltip.property("title", tmpID);
}
  


//******Make sure tooltip is in window bounds
function resizeTooltip() {
  var mapRect = document.getElementById("map").getBoundingClientRect();
  var tmpWindows = ["d3Tooltip"];
        
  tmpWindows.forEach(function(win) {
    var winRect = document.getElementById(win).getBoundingClientRect();
    if(winRect.bottom > mapRect.bottom) {
      d3.select("#" + win).style("top", mapRect.height - winRect.height + "px");
    }
    if(winRect.right > mapRect.right) {
      d3.select("#" + win).style("left", mapRect.width - winRect.width + "px");
    }
  });
}



//******Adjust div position to ensure that it isn't overflowing window
function resizePanels() {
  var bodyRect = document.body.getBoundingClientRect();
  var tmpWindows = ["infoDiv", "plantDiv", "locateDiv", "legendDiv", "downloadDiv"];
        
  tmpWindows.forEach(function(win) {
    var winRect = document.getElementById(win).getBoundingClientRect();
    if(winRect.bottom > bodyRect.bottom) {
      d3.select("#" + win).style("top", bodyRect.height - winRect.height + "px");
    }
    if(winRect.right > bodyRect.right) {
      d3.select("#" + win).style("left", bodyRect.width - winRect.width + "px");
    }
  });
  d3.select("#legendImgDiv").style("min-width", "0px").style("width", "auto");
  var legRect = document.getElementById("legendImgDiv").getBoundingClientRect();
  d3.select("#legendImgDiv").style("min-width", legRect.width + "px");
}



//******Add criteria for search location query
function addCrit(tmpForm) {
  var tmpOpts = String(tmpForm.critLayer.selectedIndex) + String(tmpForm.critOp.selectedIndex);
  for(obj in infoObj) {
    if(infoObj[obj] == tmpForm.critLayer.value) {
      var tmpLayer = obj;
      break;
    }
  }

  var tmpRet = false;
  critUsed.some(function(obj) {
    if(obj.layer.includes(tmpLayer)) {
      alert("A criteria has already been specified for this layer. Please remove the existing criteria and add an updated one.");
      tmpRet = true;
    }
    /*
    if(obj.key == tmpOpts) {
      alert("This layer and operator combination is already specified. Please remove the existing criteria and add an updated one.");
      tmpRet = true;
    }
    */
    return obj.key == tmpOpts;
  });
  
  if(tmpRet == true) { return; }

  critUsed.push({"key": tmpOpts, "layer": tmpLayer, "option": tmpForm.critOp.value, "value": tmpForm.critVal.value});

  var tmpDiv = d3.select("#critAddedDiv");
  tmpDiv.insert("div", ":first-child")
    .attr("id", "critAddedDiv_" + tmpOpts)
    .attr("class", "critAddedDiv")
    .html('<p class="critAddedP">' + tmpForm.critLayer.value + " " + tmpForm.critOp.value + " " + tmpForm.critVal.value + '<span class="critRemove fa fa-times-circle" data-opts="' + tmpOpts + '" onclick="removeCrit(this)" title="Remove this criteria"></span></p>');

  tmpDiv.style("display", "block");

  d3.selectAll("#critLayerSel,#critOpSel").property("selectedIndex", 0);
  d3.select("#critValInp").property("value", "");
  d3.select("#progBar")
    .attr("aria-valuenow", 0)
    .style("width", "0%")
    .text("0%");
  d3.select("#progBarDiv").style("display", "none");
}


//******Remove individual criteria
function removeCrit(tmpSpan) {
  var tmpOpts = d3.select(tmpSpan).attr("data-opts");
  var tmpDiv = "critAddedDiv_" + tmpOpts;
  d3.select("#" + tmpDiv).remove();
  critUsed.some(function(tmpObj, i) {
    if(tmpObj.key == tmpOpts) {
      critUsed.splice(i,1);
      if(critUsed.length == 0) {
        d3.select("#critAddedDiv").style("display", "none");
      }
    }
    return tmpObj.key == tmpOpts;
  });
}


//******Pass selected features and search criteria to socket to run query
function runQuery() {
  if(selFeats.length == 0) {
    alert("No features selected for 'Area Selection'.");
    return;
  }

  tmpBi = 0;

  critUsed.some(function(obj, j) {
    if(obj.layer == "solar_rad_30m_180") {
      obj.layer = "solar_rad_30m_180_100ft_buf_int";
      tmpBi = 1;
      obj.percent = obj.value;
      critUsed.splice(j,1);
      critUsed.push(obj);
    }
    else if(obj.layer == "solar_rad_30m_180_100ft_buf_int") {
      tmpBi = 2;
      critUsed.splice(j,1);
      critUsed.push(obj);
    }

    return obj.layer.includes("solar_rad_30m_180");
  });

  if(tmpBi == 0) {
    critUsed.push({"key": "55", "layer": "solar_rad_30m_180_100ft_buf_int", "option": ">=", "value": 0, "percent": 0});
  }

  tmpOid = "";
  for (var i=0; i<selFeats.length; i++) {
    if (i == 0) {
      tmpOid = "(b." + queryIDField[gjCurName] + " = '" + selFeats[0] + "'";
      }
    else {
      tmpOid += " or b." + queryIDField[gjCurName] + " = '" + selFeats[i] + "'";
      }
    }
  tmpOid += ")";


  var input = {"layer": gjCurName, "oid": tmpOid, "crit": critUsed};
  d3.select("#progBarDiv").style("display", "block");
  socket.emit("get_rid", input);
}




//******Tutorial
function startIntro() {
  var intro = introJs();
  intro.setOptions({
    steps: [
      //0
      { intro: '<b>Welcome to the <span style="font-family:nebulous;color:orangered;font-weight:bold;">MI Riparian Planting Prioritization Tool</span></b><img src="images/tree_icon.png" style="height:50px;display:block;margin:auto;"></img>This app is designed to assist with locating potential tree planting locations along riparian corridors through customizable area selection and criteria specification.' },
      //1
      { element: document.querySelector("#launchIntro"), intro: "To access this guide at any time simply click on the 'Tutorial' link." },
      //2
      { element: document.querySelector("#baselayerSelect"), intro: "Use this dropdown menu  to change the basemap displayed on the map." },
      //3
      { element: document.querySelector("#overlaySelect"), intro: "Use this dropdown menu  to add raster and pologyon overlay layers. Here the HUC 8 polygon layer has been added." },
      //4
      { element: document.querySelector("#panelTools"), intro: 'These icons are used to show/hide tool windows and assist with manuevering around the map:<ul><li><span class="fa fa-th-list intro-fa"></span> Show/hide map legend window</li><li><span class="fa fa-info intro-fa"></span> Show/hide feature identification window</li><li><span class="fa fa-tree intro-fa"></span> Show/hide planting location window</li><li><span class="fa fa-search intro-fa"></span> Show/hide map location search window</li><li><span class="fa fa-globe intro-fa"></span> Zoom to full-extent of the map</li></ul>' },
      //5
      { element: document.querySelector("#legendDiv"), intro: "The legend window provides the user with:<ul><li>A legend key for each layer</li><li>A slider to change the opacity of the layer (here it is shown at 50%)</li><li>The ability to change the layer order on the map by dragging and dropping</li></ul>" },
      //6
      { element: document.querySelector("#infoDiv"), intro: "When the map is clicked, the identify window lists feature names and values for all displayed raster and polygon overlay layers." },
      //7
      { element: document.querySelector("#plantDiv"), intro: "The planting location window enables the user to:<ul><li>Select areas to conduct analyses</li><li>Specify criteria for locating potential planting sites</li></ul>Instructions for performing an analysis can be found by clicking the 'About' link at the top of the page." },
      //8
      { element: document.querySelector("#resultsDiv"), intro: 'The results window shows completed runs and enables the user to:<ul><li><span class="fa fa-info-circle intro-fa"></span> View the area selection and criteria used for the analysis</li><li><span class="fa fa-check-square intro-fa"></span> Turn the layer on/off</li><li><span class="fa fa-eye intro-fa"></span> Adjust the layer\'s opacity</li><li><span class="fa fa-search-plus intro-fa"></span> Zoom to the layer on the map</li><li><span class="fa fa-download intro-fa"></span> Download the layer</li><li><span class="fa fa-times-circle intro-fa"></span> Permanently remove the layer</li><ul>', position: "bottom" },
      //9
      { element: document.querySelector("#printControl"), intro: "The print icon enables the user to save an image of the screen to a PDF file." },
      //10
      { element: document.querySelector("#showDetails"), intro: "The 'About' link opens a window providing information about the tool, and details and download links for the raster and polygon layers used by the tool." },
      //11
      { intro: 'Thank you for touring the <span style="font-family:nebulous;color:orangered;font-weight:bold;">MI Riparian Planting Prioritization Tool</span>!<img src="images/tree_icon.png" style="height:70px;display:block;margin:auto;"></img>Questions or comments can be directed to <a href="mailto:jcoombs@umass.edu?subject=MI Riparian Planting Prioritization Tool" target="_blank">Jason Coombs</a>.' },

    ],
    tooltipPosition: 'auto',
    positionPrecedence: ['left', 'right', 'bottom', 'top'],
    showStepNumbers: false,
    hidePrev: true,
    hideNext: true,
    scrollToElement: true,
    disableInteraction: true,
  });



  intro.onchange(function() { 
    switch (this._currentStep) {
      case 0:
        revertIntro();
        break;
      case 1:
        revertIntro();
        d3.select("#launchIntro").style("color","navy");
        break;
      case 2:
        revertIntro();
        d3.select("#baselayerListDropdown").style("display", "inline-block");
        break;
      case 3:
        revertIntro();
        $("#layerToggleDiv9").click();
        d3.select("#overlayListDropdown").style("display", "inline-block");
        break;
      case 4:
        revertIntro();
        $("#layerToggleDiv9").click();
        d3.select("#panelTools").selectAll("span").style("color", "navy");
        break;
      case 5:
        revertIntro();
        $("#layerToggleDiv9").click();
        d3.select("#legendDiv").style("opacity", 1).style("display", "block");
        d3.selectAll(".legendTitle").each(function() { $(this).click(); });
        d3.select("#wbdhu8_miLegendSlider").select("span").style("left", "50%");
        huc8.setOpacity(0.5);
        break;        
      case 6:
        revertIntro();
        $("#layerToggleDiv9").click();
        d3.select("#infoP").text("HUC-8: Ontonagon");
        d3.select("#infoDiv").style("opacity", 1).style("display", "block");
        break;
      case 7:
        revertIntro();
        d3.select("#plantDiv").style("opacity", 1).style("display", "block");
        break;
      case 8:
        revertIntro();
        var tmpSecs = new Date().getHours() * 3600 + new Date().getMinutes() * 60 + new Date().getSeconds();
        var cs_id = "HUC-12-" + tmpSecs;
        d3.select("#rpccrDiv")
          .append("div")
          .attr("id", cs_id)
          .html('<p class="rpccrP">' + cs_id
            + '<span class="fa fa-info-circle" data-toggle="tooltip" data-container="body" data-placement="auto" data-html="true" title="<ul><li>Layer: HUC-12</li><li>Areas:<ul><li>Copper Creek</li></ul></li><li>Criteria:<ul><li>Tree Canopy <= 50</li></ul></li></ul>"></span>'
            + '<span id="chk_' + cs_id + '" value="0" class="fa fa-check-square" title="Click to hide layer"></span>'
            + '<span id="eye_' + cs_id + '" value="0" data-opa="100" class="fa fa-eye" title="Click to change layer opacity | Current: 100%"></span>'
            + '<span id="zoom_' + cs_id + '" class="fa fa-search-plus" title="Click to zoom to layer"></span>'
            + '<a class="rpccrA" href="zips/intro_example.zip" target="_blank">'
              + '<span id="zip_' + cs_id + '" class="fa fa-download" title="Click to download layer"></span>'
            + '</a>'
            + '<span id="remove_' + cs_id + '" value="0" data-div="' + cs_id + '" class="critRemove fa fa-times-circle" title="Click to permanently remove results layer"></span>'
          + '</p>');
        map.addLayer(huc12);
        map.addLayer(intro_example);
        map.fitBounds([[46.557404531,-89.961141089],[46.652063889,-89.857069204]]);
        d3.select("#plantDiv").style("opacity", 1).style("display", "block").classed("intro_vis", true);
        d3.select("#resultsDiv").style("display", "block");
        break;
      case 9: 
        revertIntro();
        d3.select("#printControl").style("color", "navy");
        break;
      case 10:
        revertIntro();
        d3.select("#showDetails").style("color","navy");
        d3.select("#helpDiv").classed("show", true).style("display", "block");
        break;
      case 11:
        revertIntro();
        break;
    }
  });

  intro.onbeforechange(function() { 
    switch (this._currentStep) {
      case 0:
        break;
    }  
  });


  intro.onafterchange(function() { 
    switch (this._currentStep) {
      case 0:
        break;
    }  
  });



  intro.oncomplete(function() { 
    //localStorage.setItem('doneTour', 'yeah!'); 
    revertIntro();
  });

  intro.onexit(function() {
    revertIntro();
  });            


  intro.start();



  function revertIntro() {
    //0
    map.fitBounds([[41.5,-91],[47.9,-82]]);
    d3.select("#locateDiv").style("opacity", "").style("display", "");
    //1
    d3.select("#launchIntro").style("color", "");
    //2
    d3.select("#baselayerListDropdown").style("display", "");
    //3
    d3.select("#overlayListDropdown").style("display", "");
    if(d3.select("#layerToggleDiv9").select("span").style("visibility") == "visible") { $("#layerToggleDiv9").click(); };
    //4
    d3.select("#panelTools").selectAll("span").style("color", "");
    //5
    d3.select("#legendDiv").style("opacity", "").style("display", "");
    huc8.setOpacity(1);
    //6
    d3.select("#infoP").text("");
    d3.select("#infoDiv").style("opacity", "").style("display", "");
    //7
    d3.select("#plantDiv").style("opacity", "").style("display", "");
    //8
    d3.select("#resultsDiv").style("display", "");
    d3.select("#rpccrDiv").select("div").remove();
    d3.select("#plantDiv").style("opacity", "").style("display", "").classed("intro_vis", false);
    map.removeLayer(intro_example);
    map.removeLayer(huc12);
    //9
    d3.select("#printControl").style("color", "");
    //10
    d3.select("#showDetails").style("color","");
    d3.select("#helpDiv").classed("show", false).style("display", "none");
    //11
  }
}