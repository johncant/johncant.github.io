data = [];

for(var i=-10;i<=10;i++) {
  data.push([-0.07+i*Math.PI/20, Math.cos(Math.PI*i), 0.1, 1.0]);
}

var earth_radius = 2;
// Lat, Long, Amount

var gl;
var earth={};


$(function() {

  var api = {};

  api.gl;
  api.shaderProgram;

  api.mvMatrix = mat4.create();
  api.pMatrix = mat4.create();
  api.mvMatrixStack = [];

  api.earthRotationMatrix = mat4.create();
  mat4.identity(api.earthRotationMatrix);

  earth.vertexPositionBuffer = null;
  earth.vertexDataBuffer = null;
  earth.vertexRoughNormalBuffer = null;
  earth.vertexSmoothNormalBuffer = null;
  earth.vertexTextureCoordBuffer = null;
  earth.vertexIndexBuffer = null;

  api.mvPushMatrix = function() {
      var copy = mat4.create();
      mat4.set(api.mvMatrix, copy);
      api.mvMatrixStack.push(copy);
  }

  api.mvPopMatrix = function() {
      if (api.mvMatrixStack.length == 0) {
          throw "Invalid popMatrix!";
      }
      mvMatrix = api.mvMatrixStack.pop();
  }

  api.setMatrixUniforms = function() {
      api.gl.uniformMatrix4fv(api.shaderProgram.pMatrixUniform, false, api.pMatrix);
      api.gl.uniformMatrix4fv(api.shaderProgram.mvMatrixUniform, false, api.mvMatrix);

      var normalMatrix = mat3.create();
      normalMatrix[0] = api.mvMatrix[0];
      normalMatrix[1] = api.mvMatrix[1];
      normalMatrix[2] = api.mvMatrix[2];
      // Ignore                      3
      normalMatrix[3] = api.mvMatrix[4];
      normalMatrix[4] = api.mvMatrix[5];
      normalMatrix[5] = api.mvMatrix[6];
      // Ignore                      7
      normalMatrix[6] = api.mvMatrix[8];
      normalMatrix[7] = api.mvMatrix[9];
      normalMatrix[8] = api.mvMatrix[10];
      mat3.transpose(normalMatrix, normalMatrix);
      mat3.invert(normalMatrix, normalMatrix);
      api.gl.uniformMatrix3fv(api.shaderProgram.nMatrixUniform, false, normalMatrix);
  }

//  api.setMatrixUniforms = function() {
//    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
//    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
//  }

  expl = 0.1

  api.initBuffers = function(data) {
    var smoothNormalData = [];
    var roughNormalData = [];
    var textureCoordData = [];
    var vertexPositionData = [];
    var vertexDataData = [];
    var indexData = [];

    if (data) {

      for(i=0;i<data.length;i++) {
        var d = data[i];
        var val = d[0];
        var tri = d[1];

        var side01 = [tri[0][0]-tri[1][0], tri[0][1]-tri[1][1], tri[0][2]-tri[1][2]];
        var side12 = [tri[2][0]-tri[1][0], tri[2][1]-tri[1][1], tri[2][2]-tri[1][2]];
        var roughNormal = [side01[1]*side12[2]-side12[1]*side01[2]
                          ,side01[2]*side12[0]-side12[2]*side01[0]
                          ,side01[0]*side12[1]-side12[0]*side01[1]
                          ];
        var rnl = Math.sqrt(Math.pow(roughNormal[0],2)+Math.pow(roughNormal[1],2)+Math.pow(roughNormal[2],2));
        var roughNormal = [roughNormal[0]/rnl, roughNormal[1]/rnl, roughNormal[2]/rnl];
        var roughDotSmooth = roughNormal[0]*tri[0][0] + roughNormal[1]*tri[0][1] + roughNormal[2]*tri[0][2];

        if (roughDotSmooth < 0) {
          roughNormal = [-roughNormal[0], -roughNormal[1], -roughNormal[2]];
        }

        var texCoord = [,,];
        for(j=0;j<tri.length;j++) {
          var x = tri[j][0];
          var y = tri[j][1];
          var z = tri[j][2];

          // Lon, Lat
          texCoord[j] = [0.5+Math.atan2(y, x)/(2*Math.PI), Math.asin(z)/Math.PI+0.5]; // lon+pi, lat
        }


        if (texCoord[0][0]-texCoord[1][0] > 0.75 || texCoord[2][0]-texCoord[1][0] > 0.75) {
          texCoord[1][0] += 1
        }

        if (texCoord[1][0]-texCoord[0][0] > 0.75 || texCoord[2][0]-texCoord[0][0] > 0.75) {
          texCoord[0][0] += 1
        }

        if (texCoord[1][0]-texCoord[2][0] > 0.75 || texCoord[0][0]-texCoord[2][0] > 0.75) {
          texCoord[2][0] += 1
        }

        for(j=0;j<tri.length;j++) {
          for(dim=0;dim<3;dim++) {
            vertexPositionData.push(tri[j][dim])
            smoothNormalData.push(tri[j][dim])
            roughNormalData.push(roughNormal[dim])
          }
          for(dim=0;dim<2;dim++) {
            textureCoordData.push(texCoord[j][dim])
          }
          indexData.push(i*3+j)

          var logval = 1.0+0.5*Math.log(val*0.99+0.01)/Math.log(10);
          var logval = 1.0+0.5*Math.log(logval*0.99+0.01)/Math.log(10);

          trapezoid = function (v) {
            if (v < -12.0/30.0) {
              return 0
            } else if (v < -4.0/30.0) {
              return (v-(-12.0/30.0))*30.0/8.0
            } else if (v < 4.0/30.0) {
              return 1.0
            } else if (v > 4.0/30.0) {
              return (v-12.0/30)*(-30.0/8.0)
            } else {
              return 0.0
            }
          }

          vertexDataData.push(trapezoid(logval-22.0/30.0))
          vertexDataData.push(trapezoid(logval-0.5))
          vertexDataData.push(trapezoid(logval-8.0/30.0))
          vertexDataData.push(logval) // 0.1+0.5*0.9*logval)
        }
      }

    }

    earth.vertexRoughNormalBuffer = api.gl.createBuffer();
    api.gl.bindBuffer(api.gl.ARRAY_BUFFER, earth.vertexRoughNormalBuffer);
    api.gl.bufferData(api.gl.ARRAY_BUFFER, new Float32Array(roughNormalData), api.gl.STATIC_DRAW);
    earth.vertexRoughNormalBuffer.itemSize = 3;
    earth.vertexRoughNormalBuffer.numItems = roughNormalData.length / 3;

    earth.vertexSmoothNormalBuffer = api.gl.createBuffer();
    api.gl.bindBuffer(api.gl.ARRAY_BUFFER, earth.vertexSmoothNormalBuffer);
    api.gl.bufferData(api.gl.ARRAY_BUFFER, new Float32Array(smoothNormalData), api.gl.STATIC_DRAW);
    earth.vertexSmoothNormalBuffer.itemSize = 3;
    earth.vertexSmoothNormalBuffer.numItems = smoothNormalData.length / 3;

    earth.vertexTextureCoordBuffer = api.gl.createBuffer();
    api.gl.bindBuffer(api.gl.ARRAY_BUFFER, earth.vertexTextureCoordBuffer);
    api.gl.bufferData(api.gl.ARRAY_BUFFER, new Float32Array(textureCoordData), api.gl.STATIC_DRAW);
    earth.vertexTextureCoordBuffer.itemSize = 2;
    earth.vertexTextureCoordBuffer.numItems = textureCoordData.length / 2;

    earth.vertexPositionBuffer = api.gl.createBuffer();
    api.gl.bindBuffer(api.gl.ARRAY_BUFFER, earth.vertexPositionBuffer);
    api.gl.bufferData(api.gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), api.gl.STATIC_DRAW);
    earth.vertexPositionBuffer.itemSize = 3;
    earth.vertexPositionBuffer.numItems = vertexPositionData.length / 3;

    earth.vertexDataBuffer = api.gl.createBuffer();
    api.gl.bindBuffer(api.gl.ARRAY_BUFFER, earth.vertexDataBuffer);
    api.gl.bufferData(api.gl.ARRAY_BUFFER, new Float32Array(vertexDataData), api.gl.STATIC_DRAW);
    earth.vertexDataBuffer.itemSize = 4;
    earth.vertexDataBuffer.numItems = vertexDataData.length / 4;

    earth.vertexIndexBuffer = api.gl.createBuffer();
    api.gl.bindBuffer(api.gl.ELEMENT_ARRAY_BUFFER, earth.vertexIndexBuffer);
    api.gl.bufferData(api.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), api.gl.STATIC_DRAW);
    earth.vertexIndexBuffer.itemSize = 1;
    earth.vertexIndexBuffer.numItems = indexData.length;
  }

//  api.initBuffers = function() {
//    var latitudeBands = 30;
//    var longitudeBands = 30;
//    var radius = earth_radius;
//
//    var vertexPositionData = [];
//    var normalData = [];
//    var textureCoordData = [];
//    for (var latNumber=0; latNumber <= latitudeBands; latNumber++) {
//      var theta = latNumber * Math.PI / latitudeBands;
//      var sinTheta = Math.sin(theta);
//      var cosTheta = Math.cos(theta);
//
//      for (var longNumber=0; longNumber <= longitudeBands; longNumber++) {
//        var phi = longNumber * 2 * Math.PI / longitudeBands;
//        var sinPhi = Math.sin(phi);
//        var cosPhi = Math.cos(phi);
//
//        var x = cosPhi * sinTheta;
//        var y = cosTheta;
//        var z = sinPhi * sinTheta;
//        var u = 1 - (longNumber / longitudeBands);
//        var v = 1 - (latNumber / latitudeBands);
//
//        normalData.push(x);
//        normalData.push(y);
//        normalData.push(z);
//        textureCoordData.push(u);
//        textureCoordData.push(v);
//        vertexPositionData.push(radius * x);
//        vertexPositionData.push(radius * y);
//        vertexPositionData.push(radius * z);
//      }
//    }
//
//    var indexData = [];
//    for (var latNumber=0; latNumber < latitudeBands; latNumber++) {
//      for (var longNumber=0; longNumber < longitudeBands; longNumber++) {
//        var first = (latNumber * (longitudeBands + 1)) + longNumber;
//        var second = first + longitudeBands + 1;
//        indexData.push(first);
//        indexData.push(second);
//        indexData.push(first + 1);
//
//        indexData.push(second);
//        indexData.push(second + 1);
//        indexData.push(first + 1);
//      }
//    }
//
//    earth.vertexNormalBuffer = api.gl.createBuffer();
//    api.gl.bindBuffer(api.gl.ARRAY_BUFFER, earth.vertexNormalBuffer);
//    api.gl.bufferData(api.gl.ARRAY_BUFFER, new Float32Array(normalData), api.gl.STATIC_DRAW);
//    earth.vertexNormalBuffer.itemSize = 3;
//    earth.vertexNormalBuffer.numItems = normalData.length / 3;
//
//    earth.vertexTextureCoordBuffer = api.gl.createBuffer();
//    api.gl.bindBuffer(api.gl.ARRAY_BUFFER, earth.vertexTextureCoordBuffer);
//    api.gl.bufferData(api.gl.ARRAY_BUFFER, new Float32Array(textureCoordData), api.gl.STATIC_DRAW);
//    earth.vertexTextureCoordBuffer.itemSize = 2;
//    earth.vertexTextureCoordBuffer.numItems = textureCoordData.length / 2;
//
//    earth.vertexPositionBuffer = api.gl.createBuffer();
//    api.gl.bindBuffer(api.gl.ARRAY_BUFFER, earth.vertexPositionBuffer);
//    api.gl.bufferData(api.gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), api.gl.STATIC_DRAW);
//    earth.vertexPositionBuffer.itemSize = 3;
//    earth.vertexPositionBuffer.numItems = vertexPositionData.length / 3;
//
//    earth.vertexIndexBuffer = api.gl.createBuffer();
//    api.gl.bindBuffer(api.gl.ELEMENT_ARRAY_BUFFER, earth.vertexIndexBuffer);
//    api.gl.bufferData(api.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), api.gl.STATIC_DRAW);
//    earth.vertexIndexBuffer.itemSize = 1;
//    earth.vertexIndexBuffer.numItems = indexData.length;
//  }


  x = 6
  api.drawScene = function() {

    api.gl.viewportWidth = parseInt(getComputedStyle(api.canvas).getPropertyValue('width'), 10);
    api.gl.viewportHeight = parseInt(getComputedStyle(api.canvas).getPropertyValue('height'), 10);
    api.canvas.width = api.gl.viewportWidth
    api.canvas.height = api.gl.viewportHeight

    api.gl.viewport(0, 0, api.gl.viewportWidth, api.gl.viewportHeight);
    api.gl.clear(api.gl.COLOR_BUFFER_BIT | api.gl.DEPTH_BUFFER_BIT);

    api.gl.uniformMatrix4fv(api.shaderProgram.pMatrixUniform, false, api.pMatrix);

    var lighting = true;  //document.getElementById("lighting").checked;
    api.gl.uniform1i(api.shaderProgram.useLightingUniform, lighting);
    api.gl.uniform1i(api.shaderProgram.useDataUniform, false);
    if (lighting) {
      api.gl.uniform3f(
        api.shaderProgram.ambientColorUniform,
        parseFloat(0.0),
        parseFloat(0.0),
        parseFloat(0.0)
      );

      var lightingDirection = [ 5, 0, -5 ];
      var adjustedLD = vec3.create();
      vec3.normalize(adjustedLD, lightingDirection);
      vec3.scale(adjustedLD, adjustedLD, -1);
      api.gl.uniform3fv(api.shaderProgram.lightingDirectionUniform, adjustedLD);

      api.gl.uniform3f(
        api.shaderProgram.directionalColorUniform,
        parseFloat(1.0),
        parseFloat(1.0),
        parseFloat(1.0)
      );

    }

    mat4.identity(api.mvMatrix);
    mat4.identity(api.mvMatrix);

    mat4.translate(api.mvMatrix, api.mvMatrix, [0, 0, -x]);

    mat4.multiply(api.mvMatrix, api.mvMatrix, api.earthRotationMatrix);
//    mat4.multiply(api.mvMatrix, api.mvMatrix, api.earthRotationMatrix);

    //api.earthTexture = heatmap_texture.texture;
    //api.gl.bindTexture(api.gl.TEXTURE_2D, heatmap_texture.texture);
    //api.gl.activeTexture(api.gl.TEXTURE0);
    api.gl.bindTexture(api.gl.TEXTURE_2D, api.earthTexture);
    api.gl.uniform1i(api.shaderProgram.samplerUniform, 0);

    api.gl.bindBuffer(api.gl.ARRAY_BUFFER, earth.vertexPositionBuffer);
    api.gl.vertexAttribPointer(api.shaderProgram.vertexPositionAttribute, earth.vertexPositionBuffer.itemSize, api.gl.FLOAT, false, 0, 0);

    api.gl.bindBuffer(api.gl.ARRAY_BUFFER, earth.vertexTextureCoordBuffer);
    api.gl.vertexAttribPointer(api.shaderProgram.textureCoordAttribute, earth.vertexTextureCoordBuffer.itemSize, api.gl.FLOAT, false, 0, 0);

    api.gl.bindBuffer(api.gl.ARRAY_BUFFER, earth.vertexSmoothNormalBuffer);
    api.gl.vertexAttribPointer(api.shaderProgram.vertexNormalAttribute, earth.vertexSmoothNormalBuffer.itemSize, api.gl.FLOAT, false, 0, 0);

    api.gl.bindBuffer(api.gl.ARRAY_BUFFER, earth.vertexDataBuffer);
    api.gl.vertexAttribPointer(api.shaderProgram.vertexDataAttribute, earth.vertexDataBuffer.itemSize, api.gl.FLOAT, false, 0, 0);

    api.gl.bindBuffer(api.gl.ELEMENT_ARRAY_BUFFER, earth.vertexIndexBuffer);
    api.setMatrixUniforms();
    api.gl.drawElements(api.gl.TRIANGLES, earth.vertexIndexBuffer.numItems, api.gl.UNSIGNED_SHORT, 0);

    // Great. Now draw the data
    api.gl.uniform1i(api.shaderProgram.useDataUniform, true);
    api.gl.uniform1i(api.shaderProgram.useLighting, false);

    api.gl.bindBuffer(api.gl.ARRAY_BUFFER, earth.vertexRoughNormalBuffer);
    api.gl.vertexAttribPointer(api.shaderProgram.vertexNormalAttribute, earth.vertexRoughNormalBuffer.itemSize, api.gl.FLOAT, false, 0, 0);


    api.gl.drawElements(api.gl.TRIANGLES, earth.vertexIndexBuffer.numItems, api.gl.UNSIGNED_SHORT, 0);

    window.requestAnimationFrame(api.drawScene);
  }

  api.webGLStart = function() {
    var canvas = document.getElementById("gl_demo1");
    gl = initGL(canvas);
    api.gl = gl
    api.canvas = canvas
    api.initBuffers();


    api.gl.clearColor(0.1, 0.0, 0.0, 1.0);
    api.gl.enable(api.gl.DEPTH_TEST);
    api.gl.enable(api.gl.BLEND);
    api.gl.depthFunc(api.gl.LESS);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    api.initShaders();
    api.initTexture();
    mat4.perspective(api.pMatrix, 45, api.gl.viewportWidth / api.gl.viewportHeight, 0.1, 100.0);
    api.drawScene();

    canvas.onmousedown = handleMouseDown;
    document.onmouseup = handleMouseUp;
    document.onmousemove = handleMouseMove;
    document.onmousewheel = handleScroll;

    $.get('sphere.json', function(data) {
      api.initBuffers(data);
    });

  }

  var degToRad = function(degrees) {
      return degrees * Math.PI / 180;
  }

  var mouseDown = false;
  var lastMouseX = null;
  var lastMouseY = null;

  function handleMouseDown(event) {
    mouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    console.log("Mouse down!");
  }

  function handleMouseUp(event) {
    mouseDown = false;
    console.log("Mouse up!");
  }

  function handleMouseMove(event) {
    if (!mouseDown) {
      return;
    }
    var newX = event.clientX;
    var newY = event.clientY;

    var deltaX = newX - lastMouseX;
    var newRotationMatrix = mat4.create();
    mat4.identity(newRotationMatrix);
    mat4.rotate(newRotationMatrix, newRotationMatrix, degToRad(deltaX / 10), [0, 1, 0]);

    var deltaY = newY - lastMouseY;
    mat4.rotate(newRotationMatrix, newRotationMatrix, degToRad(deltaY / 10), [1, 0, 0]);

    mat4.multiply(api.earthRotationMatrix, newRotationMatrix, api.earthRotationMatrix);

    console.log(api.earthRotationMatrix)
    lastMouseX = newX
    lastMouseY = newY;
  }

  function handleScroll(event) {
    var scale = Math.pow(1.01, event.wheelDelta/240.0);
    console.log(scale);
    mat4.scale(api.pMatrix, api.pMatrix, [scale, scale, 1, 1])
    console.log(api.pMatrix);
  }

  api.initShaders = function() {
    var fragmentShader = getShader(api.gl, "shader-fs");
    var vertexShader = getShader(api.gl, "shader-vs");

    api.shaderProgram = api.gl.createProgram();
    api.gl.attachShader(api.shaderProgram, vertexShader);
    api.gl.attachShader(api.shaderProgram, fragmentShader);
    api.gl.linkProgram(api.shaderProgram);

    if (!api.gl.getProgramParameter(api.shaderProgram, api.gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    api.gl.useProgram(api.shaderProgram);

    api.shaderProgram.vertexPositionAttribute = api.gl.getAttribLocation(api.shaderProgram, "aVertexPosition");
    api.gl.enableVertexAttribArray(api.shaderProgram.vertexPositionAttribute);

    api.shaderProgram.vertexDataAttribute = api.gl.getAttribLocation(api.shaderProgram, "aVertexValue");
    api.gl.enableVertexAttribArray(api.shaderProgram.vertexDataAttribute);

    api.shaderProgram.textureCoordAttribute = api.gl.getAttribLocation(api.shaderProgram, "aTextureCoord");
    api.gl.enableVertexAttribArray(api.shaderProgram.textureCoordAttribute);

    api.shaderProgram.vertexNormalAttribute = api.gl.getAttribLocation(api.shaderProgram, "aVertexNormal");
    api.gl.enableVertexAttribArray(api.shaderProgram.vertexNormalAttribute);

    api.shaderProgram.pMatrixUniform = api.gl.getUniformLocation(api.shaderProgram, "uPMatrix");
    api.shaderProgram.mvMatrixUniform = api.gl.getUniformLocation(api.shaderProgram, "uMVMatrix");
    api.shaderProgram.nMatrixUniform = api.gl.getUniformLocation(api.shaderProgram, "uNMatrix");
    api.shaderProgram.samplerUniform = api.gl.getUniformLocation(api.shaderProgram, "uSampler");
    api.shaderProgram.useLightingUniform = api.gl.getUniformLocation(api.shaderProgram, "uUseLighting");
    api.shaderProgram.useDataUniform = api.gl.getUniformLocation(api.shaderProgram, "uUseData");
    api.shaderProgram.ambientColorUniform = api.gl.getUniformLocation(api.shaderProgram, "uAmbientColor");
    api.shaderProgram.lightingDirectionUniform = api.gl.getUniformLocation(api.shaderProgram, "uLightingDirection");
    api.shaderProgram.directionalColorUniform = api.gl.getUniformLocation(api.shaderProgram, "uDirectionalColor");
  }

  api.initTexture = function() {
    //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fb.width, fb.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    //api.gl.texImage2D(api.gl.TEXTURE_2D, 0, api.gl.RGBA, api.gl.RGBA, api.gl.UNSIGNED_BYTE, api.earthTexture.image);

    api.earthTexture = api.gl.createTexture();
    api.earthTexture.image = new Image();
    api.earthTexture.image.onload = function() {
      api.gl.pixelStorei(api.gl.UNPACK_FLIP_Y_WEBGL, true);
      api.gl.bindTexture(api.gl.TEXTURE_2D, api.earthTexture);
      api.gl.texImage2D(api.gl.TEXTURE_2D, 0, api.gl.RGBA, api.gl.RGBA, api.gl.UNSIGNED_BYTE, api.earthTexture.image);
      api.gl.texParameteri(api.gl.TEXTURE_2D, api.gl.TEXTURE_MAG_FILTER, api.gl.LINEAR);
      api.gl.texParameteri(api.gl.TEXTURE_2D, api.gl.TEXTURE_MIN_FILTER, api.gl.LINEAR_MIPMAP_NEAREST);
      api.gl.texParameteri(api.gl.TEXTURE_2D, api.gl.TEXTURE_WRAP_S, api.gl.REPEAT);
      api.gl.texParameteri(api.gl.TEXTURE_2D, api.gl.TEXTURE_WRAP_T, api.gl.REPEAT);
      api.gl.generateMipmap(api.gl.TEXTURE_2D);
      api.gl.bindTexture(api.gl.TEXTURE_2D, null);
    }
    api.earthTexture.image.src = "earth2.jpg";
  }


  api.webGLStart();

  window.api = api;

});

getShader = function(gl, id) {
  var shaderScript = document.getElementById(id);
  if (!shaderScript) {
      return null;
  }

  var str = "";
  var k = shaderScript.firstChild;
  while (k) {
      if (k.nodeType == 3)
          str += k.textContent;
      k = k.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
      shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
      shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
      return null;
  }

  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(shader));
      return null;
  }

  return shader;
}

initGL = function(canvas) {
  try {
    gl = canvas.getContext("experimental-webgl", {antialias: true});
    gl.viewportWidth = parseInt(getComputedStyle(canvas).getPropertyValue('width'), 10);
    gl.viewportHeight = parseInt(getComputedStyle(canvas).getPropertyValue('height'), 10);
    canvas.width = gl.viewportWidth
    canvas.height = gl.viewportHeight
  } catch(e) {
  }
  if (!gl) {
    alert("Could not initialise WebGL, sorry :-( ");
  }

  return gl;
}


