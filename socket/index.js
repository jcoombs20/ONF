var app = require("express")();
var http = require("http").createServer(app);
var io = require("socket.io")(http);
var topojson = require("topojson-server");
var topoSimp = require("topojson-simplify");
var async = require('async');
var bcrypt = require('bcrypt');

const { Pool } = require("pg");

app.get("/", function(req, res) {
  res.send('<h1>Ottawa National Forest Riparian Planting Tool</h1><p style="color:blue;">Listening for queries...</p>');
});

io.on("connection", function(socket) {
  console.log("a user connected");

  socket.on("disconnect", function() {
    console.log("user disconnected");
  });

  socket.on("test", function(tmpData) {
    console.log(tmpData);
    socket.emit("test", tmpData + " back at ya!");
  });

  socket.on("get_rid", function(input) {
    console.log("Acquiring rid values from solar_rad_30m_180_100ft_buf contained within the selected polygon feature(s)");

    var tmpQueries = [];
    input.crit.forEach(function(crit) {
      tmpQueries.push("SELECT a.rid FROM gis." + crit.layer + " a, gis." + input.layer + " b WHERE " + input.oid + " and ST_Intersects(a.rast, b.geom) = 't';");
    });
    //console.log(tmpQueries);

    const pool = new Pool({
      user: "Jason",
      host: "localhost",
      database: "ottawa",
      password: "Jason20!",
      port: 5432,
    });

    var queue = [];
    tmpQueries.forEach(function(query,i) {
      queue.push(pool.query.bind(pool, query));
    });

    var rid = [];
    async.parallel(queue, function(err, results) {
      for(var i in results) {
        //console.log(results);
        rid.push(results[i].rows);
      }
      socket.emit("get_rid", rid);
    });    
  });


  socket.on("solar_gain_percentile", function(input) {
    console.log("Acquiring solar gain distribution from solar_rad_30m_180_100ft_buf_int to determine value that corresponds with user-specified percentile");

    var tmpQueries = [];

    tmpQueries.push("SELECT (tmpvals).value, sum((tmpVals).count) as count FROM (SELECT ST_ValueCount(ST_Clip(a.rast,b.geom), 1, true) As tmpVals FROM gis.solar_rad_30m_180_100ft_buf_int a, gis." + input.layer + " b WHERE " + input.oid + input.rid + ") as foo GROUP BY (tmpvals).value ORDER BY (tmpvals).value;");  
    //console.log(tmpQueries);

    const pool = new Pool({
      user: "Jason",
      host: "localhost",
      database: "ottawa",
      password: "Jason20!",
      port: 5432,
    });

    var queue = [];
    tmpQueries.forEach(function(query,i) {
      queue.push(pool.query.bind(pool, query));
    });

    async.parallel(queue, function(err, results) {
      for(var i in results) {
        var tmpData = results[i].rows;
      
        totpix = 0;
        for (var j=0; j<tmpData.length; j++) {
          totpix += parseInt(tmpData[j].count);
        }

        var tmpVal = Math.round(totpix * (input.solGainCrit.percent/100));

        var tmpCnt = 0;
        for (var j=0; j<tmpData.length; j++) {
          tmpCnt += parseInt(tmpData[j].count);
          if (tmpCnt >= tmpVal) {
            break;
            }
          }

        var retData = {"value": tmpData[j].value};

        console.log("Successfully acquired solar gain value corresponding with user-specified percentile: " + tmpData[j].value);
        socket.emit('solar_gain_percentile', retData);
      }
    });    
  });


  socket.on('map_algebra', function (input) {
    console.log("Performing map algebra using user-specified values");
  
    var fs = require('fs');

    var tmpQueries = [];
    switch(input.crit.length) {
      case 0:
        break;
      case 1:
        tmpQueries.push("SELECT ST_AsTIFF(ma1) as tiffvals FROM (SELECT ST_MapAlgebra(rsUnion1, NULL, '(CASE WHEN [rast] " + input.crit[0].option + " " + input.crit[0].value + " THEN 101 ELSE 100 END::int)') as ma1 FROM (SELECT ST_Union(rsClip1) as rsUnion1 FROM (SELECT ST_Clip(a.rast,b.geom) as rsClip1 FROM gis." + input.crit[0].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[0] + ") as foo) as foo2) as foo3;");
        break;
      case 2:
        tmpQueries.push("SELECT ST_AsTIFF(ma1) as tiffvals FROM (SELECT ST_MapAlgebra(rsUnion1, rsUnion2, '(CASE WHEN [rast1] " + input.crit[0].option + " " + input.crit[0].value + " and [rast2] " + input.crit[1].option + " " + input.crit[1].value + " THEN 101 ELSE 100 END::int)') as ma1 FROM (SELECT ST_Union(rsClip1) as rsUnion1 FROM (SELECT ST_Clip(a.rast,b.geom) as rsClip1 FROM gis." + input.crit[0].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[0] + ") as foo1) as foo2, (SELECT ST_Union(rsClip2) as rsUnion2 FROM (SELECT ST_Clip(a.rast,b.geom) as rsClip2 FROM gis." + input.crit[1].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[1] + ") as foo3) as foo4) as foo5;");
        break;
      case 3:
        tmpQueries.push("SELECT ST_AsTIFF(ma2) as tiffvals FROM (SELECT ST_MapAlgebra(rsUnion1, ma1, '(CASE WHEN [rast1] " + input.crit[0].option + " " + input.crit[0].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma2 FROM (SELECT ST_Union(rsClip1) as rsUnion1 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip1 FROM gis." + input.crit[0].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[0] + ") as foo1) as foo2, (SELECT ST_MapAlgebra(rsUnion2, rsUnion3, '(CASE WHEN [rast1] " + input.crit[1].option + " " + input.crit[1].value + " and [rast2] " + input.crit[2].option + " " + input.crit[2].value + " THEN 101 ELSE 100 END::int)') as ma1 FROM (SELECT ST_Union(rsClip2) as rsUnion2 FROM (SELECT ST_Clip(a.rast,b.geom) as rsClip2 FROM gis." + input.crit[1].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[1] + ") as foo3) as foo4, (SELECT ST_Union(rsClip3) as rsUnion3 FROM (SELECT ST_Clip(a.rast,b.geom) as rsClip3 FROM gis." + input.crit[2].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[2] + ") as foo5) as foo6) as foo7) as foo8;");
        break;
      case 4:
        tmpQueries.push("SELECT ST_AsTIFF(ma3) as tiffvals FROM (SELECT ST_MapAlgebra(rsUnion1, ma2, '(CASE WHEN [rast1] " + input.crit[0].option + " " + input.crit[0].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma3 FROM (SELECT ST_Union(rsClip1) as rsUnion1 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip1 FROM gis." + input.crit[0].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[0] + ") as foo1) as foo2, (SELECT ST_MapAlgebra(rsUnion2, ma1, '(CASE WHEN [rast1] " + input.crit[1].option + " " + input.crit[1].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma2 FROM (SELECT ST_Union(rsClip2) as rsUnion2 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip2 FROM gis." + input.crit[1].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[1] + ") as foo3) as foo4, (SELECT ST_MapAlgebra(rsUnion3, rsUnion4, '(CASE WHEN [rast1] " + input.crit[2].option + " " + input.crit[2].value + " and [rast2] " + input.crit[3].option + " " + input.crit[3].value + " THEN 101 ELSE 100 END::int)') as ma1 FROM (SELECT ST_Union(rsClip3) as rsUnion3 FROM (SELECT ST_Clip(a.rast,b.geom) as rsClip3 FROM gis." + input.crit[2].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[2] + ") as foo5) as foo6, (SELECT ST_Union(rsClip4) as rsUnion4 FROM (SELECT ST_Clip(a.rast,b.geom) as rsClip4 FROM gis." + input.crit[3].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[3] + ") as foo7) as foo8) as foo9) as foo10) as foo11;");
        break;
      case 5:
        tmpQueries.push("SELECT ST_AsTIFF(ma4) as tiffvals FROM (SELECT ST_MapAlgebra(rsUnion1, ma3, '(CASE WHEN [rast1] " + input.crit[0].option + " " + input.crit[0].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma4 FROM (SELECT ST_Union(rsClip1) as rsUnion1 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip1 FROM gis." + input.crit[0].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[0] + ") as foo1) as foo2, (SELECT ST_MapAlgebra(rsUnion2, ma2, '(CASE WHEN [rast1] " + input.crit[1].option + " " + input.crit[1].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma3 FROM (SELECT ST_Union(rsClip2) as rsUnion2 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip2 FROM gis." + input.crit[1].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[1] + ") as foo3) as foo4, (SELECT ST_MapAlgebra(rsUnion3, ma1, '(CASE WHEN [rast1] " + input.crit[2].option + " " + input.crit[2].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma2 FROM (SELECT ST_Union(rsClip3) as rsUnion3 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip3 FROM gis." + input.crit[2].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[2] + ") as foo5) as foo6, (SELECT ST_MapAlgebra(rsUnion4, rsUnion5, '(CASE WHEN [rast1] " + input.crit[3].option + " " + input.crit[3].value + " and [rast2] " + input.crit[4].option + " " + input.crit[4].value + " THEN 101 ELSE 100 END::int)') as ma1 FROM (SELECT ST_Union(rsClip4) as rsUnion4 FROM (SELECT ST_Clip(a.rast,b.geom) as rsClip4 FROM gis." + input.crit[3].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[3] + ") as foo7) as foo8, (SELECT ST_Union(rsClip5) as rsUnion5 FROM (SELECT ST_Clip(a.rast,b.geom) as rsClip5 FROM gis." + input.crit[4].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[4] + ") as foo9) as foo10) as foo11) as foo12) as foo13) as foo14;");
        break;
      case 6:
        tmpQueries.push("SELECT ST_AsTIFF(ma5) as tiffvals FROM (SELECT ST_MapAlgebra(rsUnion1, ma4, '(CASE WHEN [rast1] " + input.crit[0].option + " " + input.crit[0].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma5 FROM (SELECT ST_Union(rsClip1) as rsUnion1 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip1 FROM gis." + input.crit[0].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[0] + ") as foo1) as foo2, (SELECT ST_MapAlgebra(rsUnion2, ma3, '(CASE WHEN [rast1] " + input.crit[1].option + " " + input.crit[1].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma4 FROM (SELECT ST_Union(rsClip2) as rsUnion2 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip2 FROM gis." + input.crit[1].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[1] + ") as foo3) as foo4, (SELECT ST_MapAlgebra(rsUnion3, ma2, '(CASE WHEN [rast1] " + input.crit[2].option + " " + input.crit[2].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma3 FROM (SELECT ST_Union(rsClip3) as rsUnion3 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip3 FROM gis." + input.crit[2].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[2] + ") as foo5) as foo6, (SELECT ST_MapAlgebra(rsUnion4, ma1, '(CASE WHEN [rast1] " + input.crit[3].option + " " + input.crit[3].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma2 FROM (SELECT ST_Union(rsClip4) as rsUnion4 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip4 FROM gis." + input.crit[3].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[3] + ") as foo7) as foo8, (SELECT ST_MapAlgebra(rsUnion5, rsUnion6, '(CASE WHEN [rast1] " + input.crit[4].option + " " + input.crit[4].value + " and [rast2] " + input.crit[5].option + " " + input.crit[5].value + " THEN 101 ELSE 100 END::int)') as ma1 FROM (SELECT ST_Union(rsClip5) as rsUnion5 FROM (SELECT ST_Clip(a.rast,b.geom) as rsClip5 FROM gis." + input.crit[4].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[4] + ") as foo9) as foo10, (SELECT ST_Union(rsClip6) as rsUnion6 FROM (SELECT ST_Clip(a.rast,b.geom) as rsClip6 FROM gis." + input.crit[5].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[5] + ") as foo11) as foo12) as foo13) as foo14) as foo15) as foo16) as foo17;");
        break;
      case 7:
        tmpQueries.push("SELECT ST_AsTIFF(ma6) as tiffvals FROM (SELECT ST_MapAlgebra(rsUnion1, ma5, '(CASE WHEN [rast1] " + input.crit[0].option + " " + input.crit[0].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma6 FROM (SELECT ST_Union(rsClip1) as rsUnion1 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip1 FROM gis." + input.crit[0].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[0] + ") as foo1) as foo2, (SELECT ST_MapAlgebra(rsUnion2, ma4, '(CASE WHEN [rast1] " + input.crit[1].option + " " + input.crit[1].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma5 FROM (SELECT ST_Union(rsClip2) as rsUnion2 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip2 FROM gis." + input.crit[1].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[1] + ") as foo3) as foo4, (SELECT ST_MapAlgebra(rsUnion3, ma3, '(CASE WHEN [rast1] " + input.crit[2].option + " " + input.crit[2].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma4 FROM (SELECT ST_Union(rsClip3) as rsUnion3 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip3 FROM gis." + input.crit[2].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[2] + ") as foo5) as foo6, (SELECT ST_MapAlgebra(rsUnion4, ma2, '(CASE WHEN [rast1] " + input.crit[3].option + " " + input.crit[3].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma3 FROM (SELECT ST_Union(rsClip4) as rsUnion4 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip4 FROM gis." + input.crit[3].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[3] + ") as foo7) as foo8, (SELECT ST_MapAlgebra(rsUnion5, ma1, '(CASE WHEN [rast1] " + input.crit[4].option + " " + input.crit[4].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma2 FROM (SELECT ST_Union(rsClip5) as rsUnion5 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip5 FROM gis." + input.crit[4].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[4] + ") as foo9) as foo10, (SELECT ST_MapAlgebra(rsUnion6, rsUnion7, '(CASE WHEN [rast1] " + input.crit[5].option + " " + input.crit[5].value + " and [rast2] " + input.crit[6].option + " " + input.crit[6].value + " THEN 101 ELSE 100 END::int)') as ma1 FROM (SELECT ST_Union(rsClip6) as rsUnion6 FROM (SELECT ST_Clip(a.rast,b.geom) as rsClip6 FROM gis." + input.crit[5].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[5] + ") as foo11) as foo12, (SELECT ST_Union(rsClip7) as rsUnion7 FROM (SELECT ST_Clip(a.rast,b.geom) as rsClip7 FROM gis." + input.crit[6].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[6] + ") as foo13) as foo14) as foo15) as foo16) as foo17) as foo18) as foo19) as foo20;");
        break;
      case 8:
        tmpQueries.push("SELECT ST_AsTIFF(ma7) as tiffvals FROM (SELECT ST_MapAlgebra(rsUnion1, ma6, '(CASE WHEN [rast1] " + input.crit[0].option + " " + input.crit[0].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma7 FROM (SELECT ST_Union(rsClip1) as rsUnion1 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip1 FROM gis." + input.crit[0].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[0] + ") as foo1) as foo2, (SELECT ST_MapAlgebra(rsUnion2, ma5, '(CASE WHEN [rast1] " + input.crit[1].option + " " + input.crit[1].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma6 FROM (SELECT ST_Union(rsClip2) as rsUnion2 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip2 FROM gis." + input.crit[1].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[1] + ") as foo3) as foo4, (SELECT ST_MapAlgebra(rsUnion3, ma4, '(CASE WHEN [rast1] " + input.crit[2].option + " " + input.crit[2].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma5 FROM (SELECT ST_Union(rsClip3) as rsUnion3 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip3 FROM gis." + input.crit[2].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[2] + ") as foo5) as foo6, (SELECT ST_MapAlgebra(rsUnion4, ma3, '(CASE WHEN [rast1] " + input.crit[3].option + " " + input.crit[3].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma4 FROM (SELECT ST_Union(rsClip4) as rsUnion4 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip4 FROM gis." + input.crit[3].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[3] + ") as foo7) as foo8, (SELECT ST_MapAlgebra(rsUnion5, ma2, '(CASE WHEN [rast1] " + input.crit[4].option + " " + input.crit[4].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma3 FROM (SELECT ST_Union(rsClip5) as rsUnion5 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip5 FROM gis." + input.crit[4].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[4] + ") as foo9) as foo10, (SELECT ST_MapAlgebra(rsUnion6, ma1, '(CASE WHEN [rast1] " + input.crit[5].option + " " + input.crit[5].value + " and [rast2] = 101 THEN 101 ELSE 100 END::int)') as ma2 FROM (SELECT ST_Union(rsClip6) as rsUnion6 FROM (SELECT ST_Clip(a.rast, b.geom) as rsClip6 FROM gis." + input.crit[5].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[5] + ") as foo11) as foo12, (SELECT ST_MapAlgebra(rsUnion7, rsUnion8, '(CASE WHEN [rast1] " + input.crit[6].option + " " + input.crit[6].value + " and [rast2] " + input.crit[7].option + " " + input.crit[7].value + " THEN 101 ELSE 100 END::int)') as ma1 FROM (SELECT ST_Union(rsClip7) as rsUnion7 FROM (SELECT ST_Clip(a.rast,b.geom) as rsClip7 FROM gis." + input.crit[6].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[6] + ") as foo13) as foo14, (SELECT ST_Union(rsClip8) as rsUnion8 FROM (SELECT ST_Clip(a.rast,b.geom) as rsClip8 FROM gis." + input.crit[7].layer + " a, gis." + input.layer + " b WHERE" + input.oid + input.rid[7] + ") as foo15) as foo16) as foo17) as foo18) as foo19) as foo20) as foo21) as foo22) as foo23;");
        break;
    }
    //console.log(tmpQueries);

    const pool = new Pool({
      user: "Jason",
      host: "localhost",
      database: "ottawa",
      password: "Jason20!",
      port: 5432,
    });

    var queue = [];
    tmpQueries.forEach(function(tmpQ) {
      queue.push(pool.query.bind(pool, tmpQ));
    });

    async.parallel(queue, function(err, results) {
      if(err) {
        console.error('error running query', err);
        socket.emit('error', {'error': err});
      }
      for(var i in results) {
        var tmpData = results[i].rows;

        for (var i=0; i<tmpData.length; i++) {
          fs.writeFile("/home/jason/ottawa/tifs/" + input.file_name, tmpData[i].tiffvals, function(err) {
            if(err) {
              return console.log(err);
            }
          });
        }

        console.log(Date() + " Successfully performed map algebra and output resulting raster to GeoTIFF file");
        socket.emit('map_algebra', {'status': 'Successfully output GeoTIFF file'});
      };
    });
  });


  socket.on('zip_it', function (input) {
    //console.log("Zipping map alegbra tif file");
    
    var fs = require('fs');
    var archiver = require('archiver');

    var output = fs.createWriteStream("/home/jason/ottawa/zips/" + input.file_name.slice(0,-3) + "zip");
    var archive = archiver('zip');

    output.on('close', function() {
      console.log('200 Zip file ' + input.file_name + ' created');
      socket.emit('zip_it', {'status': 'Successfully zipped GeoTIFF file'});
    });

    archive.on('error', function(err) {
      console.error('error zipping file', err);
      socket.emit('error', {'error': err});
    });

    archive.pipe(output);

    var file1 = "/home/jason/ottawa/tifs/" + input.file_name;

    archive.append(fs.createReadStream(file1), { name: input.file_name });

    archive.finalize(function(err, bytes) {
      if (err) {
        console.error('error zipping file', err);
        socket.emit('error', {'error': err});
      }
      console.log(bytes + ' total bytes');
    });
  });



  socket.on('add_ws', function (input) {
    //console.log("Verifying that the workspace '" + input.ws + "' exists in Geoserver");

    var http = require('http');
    var options = {
      hostname: 'localhost',
      port: '8080',
      path: '/geoserver/rest/workspaces/' + input.ws,
      method: 'GET',
      auth: 'admin:pickle^of32permissions'
    }
    var gsReq = http.request(options, function(gsRes){
      if (gsRes.statusCode == 200) {
        console.log('200 Workspace ' + input.ws + ' already exists');
        socket.emit('add_ws', {'status': 'Workspace ' + input.ws + ' already exists', 'code': '200'});
      }
      else if (gsRes.statusCode == 404) {
        data = '<workspace><name>' + input.ws + '</name></workspace>';
        var wsOptions = {
          hostname: 'localhost',
          port: '8080',
          path: '/geoserver/rest/workspaces/',
          method: 'POST',
          auth: 'admin:pickle^of32permissions',
          headers: {'Content-Type':'text/xml', 'Content-Length': Buffer.byteLength(data)}
        }
        var wsReq = http.request(wsOptions, function(wsRes){
          console.log(wsRes.statusCode);
          if (wsRes.statusCode == 201) {
            console.log('405 Workspace ' + input.ws + ' created');
            socket.emit('add_ws', {'status': 'Workspace ' + input.ws + ' created', 'code': '201'});
          }
          else {
            console.log(wsRes.statusCode + ' Error creating workspace ' + input.ws);
            socket.emit('error', {'error': 'Error creating workspace ' + input.ws, 'code': wsRes.statusCode});
          }
        });
        wsReq.write(data);
        wsReq.end();
  
        wsReq.on('error', function(e) {
          console.log('problem with request: ' + e.message);
          socket.emit('error', {'error': e.message, 'code': '404'});
        });
      }
    });

    gsReq.end();

    gsReq.on('error', function(e) {
      console.log('problem with request: ' + e.message);
      socket.emit('error', {'error': e.message});
    });
  });



  socket.on('add_cs', function (input) {
    //console.log("Verifying that the coverage store '" + input.cs + "' exists in Geoserver");

    var http = require('http');
    var options = {
      hostname: 'localhost',
      port: '8080',
      path: '/geoserver/rest/workspaces/' + input.ws + "/coveragestores/" + input.cs,
      method: 'GET',
      auth: 'admin:pickle^of32permissions'
    }
    var gsReq = http.request(options, function(gsRes){
      if (gsRes.statusCode == 200) {
        console.log('200 Coverage store ' + input.cs + ' already exists');
        socket.emit('add_cs', {'status': 'Coverage store ' + input.cs + ' already exists', 'code': '200'});
      }
      else if (gsRes.statusCode == 404) {
        data =  '<coverageStore>' +
          '<name>' + input.cs + '</name>' +
          '<description>rpccr layer</description>' +
          '<type>GeoTIFF</type>' +
          '<enabled>true</enabled>' +
          '<workspace><name>' + input.ws + '</name></workspace>' +
          '<__default>false</__default>' +
          '<url>file:' + input.file + '</url>' +
          '</coverageStore>';
        var csOptions = {
          hostname: 'localhost',
          port: '8080',
          path: '/geoserver/rest/workspaces/' + input.ws + '/coveragestores/',
          method: 'POST',
          auth: 'admin:pickle^of32permissions',
          headers: {'Content-Type':'text/xml', 'Content-Length': Buffer.byteLength(data)}
        }
        var csReq = http.request(csOptions, function(csRes){
          if (csRes.statusCode == 201) {
            console.log('201 Coverage store ' + input.cs + ' created');
            socket.emit('add_cs', {'status': 'Coverage store ' + input.cs + ' created', 'code': '201'});
          }
          else {
            console.log(csRes.statusCode + ' Error creating coverage store ' + input.cs);
            socket.emit('error', {'error': 'Error creating coverage store ' + input.cs, 'code': '404'});
          }
        });
        csReq.write(data);
        csReq.end();
  
        csReq.on('error', function(e) {
          console.log('problem with request: ' + e.message);
          socket.emit('error', {'error': e.message, 'code': '404'});
        });
      }
    });

    gsReq.end();

    gsReq.on('error', function(e) {
        console.log('problem with request: ' + e.message);
      socket.emit('error', {'error': e.message, 'code': '404'});
      });
    });


  socket.on('add_coverage', function (input) {
    //console.log("Verifying that the coverage '" + input.cov + "' exists in Geoserver");

    var http = require('http');
    var options = {
      hostname: 'localhost',
      port: '8080',
      path: '/geoserver/rest/workspaces/' + input.ws + "/coveragestores/" + input.cs + '/coverages/' + input.cov,
      method: 'GET',
      auth: 'admin:pickle^of32permissions'
    }
    var gsReq = http.request(options, function(gsRes){
      if (gsRes.statusCode == 200) {
        console.log('200 Coverage ' + input.cov + ' already exists');
        socket.emit('add_coverage', {'status': 'Coverage ' + input.cov + ' already exists', 'code': '200'});
      }
      else if (gsRes.statusCode == 404) {
        data =  '<coverage><name>' + input.cov + '</name></coverage>'
        var covOptions = {
          hostname: 'localhost',
          port: '8080',
          path: '/geoserver/rest/workspaces/' + input.ws + '/coveragestores/' + input.cs + '/coverages/',
          method: 'POST',
          auth: 'admin:pickle^of32permissions',
          headers: {'Content-Type':'text/xml', 'Content-Length': Buffer.byteLength(data)}
        }
        var covReq = http.request(covOptions, function(covRes){
          if (covRes.statusCode == 201) {
            console.log('201 Coverage ' + input.cov + ' created');
            socket.emit('add_coverage', {'status': 'Coverage ' + input.cov + ' created', 'code': '201'});
          }
          else {
            console.log(covRes.statusCode + ' Error creating coverage ' + input.cov);
            socket.emit('error', {'error': 'Error creating coverage ' + input.cov, 'code': '404'});
          }
        });
        covReq.write(data);
        covReq.end();
  
        covReq.on('error', function(e) {
          console.log('problem with request: ' + e.message);
          socket.emit('error', {'error': e.message, 'code': '404'});
        });
      }
    });

    gsReq.end();

    gsReq.on('error', function(e) {
      console.log('problem with request: ' + e.message);
      socket.emit('error', {'error': e.message, 'code': '404'});
    });
  });


  socket.on('add_style', function (input) {
    //console.log("Verifying that the style '" + input.style + "' exists in Geoserver");

    var http = require('http');
    var options = {
      hostname: 'localhost',
      port: '8080',
      path: '/geoserver/rest/workspaces/' + input.ws + '/styles/' + input.style,
      method: 'GET',
      auth: 'admin:pickle^of32permissions'
    }
    var gsReq = http.request(options, function(gsRes){
      if (gsRes.statusCode == 200) {
        console.log('200 Style ' + input.style + ' already exists');
        socket.emit('add_style', {'status': 'Style ' + input.style + ' already exists', 'code': '200'});
      }
      else if (gsRes.statusCode == 404) {
        data =  '<style><name>' + input.style + '</name><filename>' + input.style + '.sld</filename></style>'
        var styleOptions = {
          hostname: 'localhost',
          port: '8080',
          path: '/geoserver/rest/workspaces/' + input.ws + '/styles/',
          method: 'POST',
          auth: 'admin:pickle^of32permissions',
          headers: {'Content-Type':'text/xml', 'Content-Length': Buffer.byteLength(data)}
        }
        var styleReq = http.request(styleOptions, function(styleRes){
          if (styleRes.statusCode == 201) {
            console.log('201 Style ' + input.style + ' created');
            socket.emit('add_style', {'status': 'Style ' + input.style + ' created', 'code': '201'});
          }
          else {
            console.log(styleRes.statusCode + ' Error creating style ' + input.style);
            socket.emit('error', {'error': 'Error creating style ' + input.style, 'code': '404'});
          }
        });
        styleReq.write(data);
        styleReq.end();
  
        styleReq.on('error', function(e) {
          console.log('problem with request: ' + e.message);
          socket.emit('error', {'error': e.message, 'code': '404'});
        });
      }
    });

    gsReq.end();

    gsReq.on('error', function(e) {
      console.log('problem with request: ' + e.message);
      socket.emit('error', {'error': e.message, 'code': '404'});
    });
  });


  socket.on('change_style', function (input) {
    //console.log("Changing the layer style to '" + input.style + "'");

    var http = require('http');
    var options = {
      hostname: 'localhost',
      port: '8080',
      path: '/geoserver/rest/layers/' + input.layer,
      method: 'GET',
      auth: 'admin:pickle^of32permissions'
    }
    var gsReq = http.request(options, function(gsRes){
      if (gsRes.statusCode == 200) {
        data =  '<layer><defaultStyle><name>' + input.ws + ":" + input.style + '</name></defaultStyle><enabled>true</enabled></layer>'
        var styleOptions = {
          hostname: 'localhost',
          port: '8080',
          path: '/geoserver/rest/layers/' + input.ws + ":" + input.layer,
          method: 'PUT',
          auth: 'admin:pickle^of32permissions',
          headers: {'Content-Type':'text/xml', 'Content-Length': Buffer.byteLength(data)}
        }
        var styleReq = http.request(styleOptions, function(styleRes){
          if (styleRes.statusCode == 200) {
            console.log('200 Style changed to ' + input.style);
            socket.emit('change_style', {'status': 'Style changed to ' + input.style + "'", 'code': '200'});
          }
          else {
            console.log(styleRes.statusCode + ' Error changing style to ' + input.style);
            socket.emit('error', {'error': 'Error changing style to ' + input.style, 'code': styleRes.statusCode});
          }
        });
        styleReq.write(data);
        styleReq.end();
  
        styleReq.on('error', function(e) {
          console.log('problem with request: ' + e.message);
          socket.emit('error', {'error': e.message, 'code': '404'});
        });
      }
      else {
        console.log(gsRes.statusCode + ' Error getting layer ' + input.layer + ' when attempting to change style to ' + input.style);
        socket.emit('error', {'error': 'Error getting layer ' + input.layer + ' when attempting to change style to ' + input.style, 'code': gsRes.statusCode});
      }
    });

    gsReq.end();

    gsReq.on('error', function(e) {
      console.log('problem with request: ' + e.message);
      socket.emit('error', {'error': e.message, 'code': '404'});
    });
  });



  socket.on("get_bbox", function(input) {
    var tmpQueries = [];
    tmpQueries.push("SELECT st_extent(geom) as bbox FROM gis." + input.layer + " b WHERE " + input.oid + ";");
    console.log(tmpQueries);

    const pool = new Pool({
      user: "Jason",
      host: "localhost",
      database: "ottawa",
      password: "Jason20!",
      port: 5432,
    });

    var queue = [];
    tmpQueries.forEach(function(query,i) {
      queue.push(pool.query.bind(pool, query));
    });

    async.parallel(queue, function(err, results) {
      for(var i in results) {
        var bbox = results[i].rows;
      }
      socket.emit("get_bbox", bbox);
    });    
  });




  socket.on('delete_rpccr_data', function(input) {
    delete_layer(input);
  });

});



http.listen(3121, function() {
  console.log("listening on *:3121");
});






function delete_layer(input) {
  var layer_name = input.cs;

  var http = require('http');
  var options = {
    hostname: 'localhost',
    port: '8080',
    path: '/geoserver/rest/layers/' + input.ws + ":" + layer_name,
    method: 'DELETE',
    auth: 'admin:pickle^of32permissions'
  }
  var gsReq = http.request(options, function(gsRes){
    if (gsRes.statusCode == 200) {
      console.log('200 Layer ' + layer_name + ' deleted');
      delete_coverage(input);
    }
    else {
      console.log(gsRes.statusCode + ' Error deleting layer ' + layer_name);
    }
  });

  gsReq.end();

  gsReq.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });
}

function delete_coverage(input) {
  var cov_name = input.cs;

  var http = require('http');
  var options = {
    hostname: 'localhost',
    port: '8080',
    path: '/geoserver/rest/workspaces/' + input.ws + '/coveragestores/' + input.cs + '/coverages/' + cov_name,
    method: 'DELETE',
    auth: 'admin:pickle^of32permissions'
  }
  var gsReq = http.request(options, function(gsRes){
    if (gsRes.statusCode == 200) {
      console.log('200 Coverage ' + cov_name + ' deleted');
      delete_cs(input);
    }
    else {
      console.log(gsRes.statusCode + ' Error deleting coverage ' + cov_name);
    }
  });

  gsReq.end();

  gsReq.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });
}

function delete_cs(input) {
  var http = require('http');
  var options = {
    hostname: 'localhost',
    port: '8080',
    path: '/geoserver/rest/workspaces/' + input.ws + '/coveragestores/' + input.cs,
    method: 'DELETE',
    auth: 'admin:pickle^of32permissions'
  }
  var gsReq = http.request(options, function(gsRes){
    if (gsRes.statusCode == 200) {
      console.log('200 Coverage store ' + input.cs + ' deleted');
      delete_geotiff(input);
    }
    else if (gsRes.statusCode == 403) {
      console.log('403 Coverage store ' + input.cs + ' is not empty');
    }
    else {
      console.log(gsRes.statusCode + 'Error deleting coverage store ' + input.cs);
    }
  });

  gsReq.end();

  gsReq.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });
}

function delete_geotiff(input) {
  var file_name = input.file_name;
  var fs = require('fs');

  fs.unlinkSync("/home/jason/ottawa/tifs/" + file_name);
  fs.unlinkSync("/home/jason/ottawa/zips/" + file_name.slice(0,-3) + "zip");

  console.log('200 GeoTIFF and zip files for ' + file_name.slice(0,-4) + ' deleted');
}
