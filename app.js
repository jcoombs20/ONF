var express = require('express');
var app = express();
var compression = require('compression');

app.use(compression());

app.use(express.static('/home/jason/ottawa'));

app.listen(3120);

console.log("Running on 3120...");
