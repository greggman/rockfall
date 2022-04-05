/*
 * Copyright 2014, Gregg Tavares.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Gregg Tavares. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// import 'https://greggman.github.io/webgl-lint/webgl-lint.js';
import * as twgl from '../3rdParty/twgl-full.module.js';

const m4 = twgl.m4;

const s_tileVertexShader = `#version 300 es
  in vec4 position;
  in vec4 texcoord;

  uniform mat4 u_matrix;
  uniform mat4 u_texMatrix;

  out vec2 v_texcoord;

  void main() {
    gl_Position = u_matrix * position;
    v_texcoord = (u_texMatrix * texcoord).xy;
  }
`;

const s_tileFragmentShader = `#version 300 es
  precision mediump float;

  uniform highp usampler2D u_tilemap;
  uniform sampler2D u_tiles;
  uniform vec2 u_tilemapSize;
  uniform vec2 u_tilesetSize;

  in vec2 v_texcoord;

  out vec4 fragColor;

  const uint xFlip = 128u;
  const uint yFlip = 64u;
  const uint xySwap = 32u;

  void main() {
    ivec2 tilemapCoord = ivec2(floor(v_texcoord));
    vec2 texcoord = fract(v_texcoord);
    uvec4 tile = texelFetch(u_tilemap, tilemapCoord, 0);

    uint flags = tile.w;
    if ((flags & xFlip) != 0u) {
      texcoord = vec2(1.0 - texcoord.x, texcoord.y);
    }
    if ((flags & yFlip) != 0u) {
      texcoord = vec2(texcoord.x, 1.0 - texcoord.y);
    }
    if ((flags & xySwap) != 0u) {
      texcoord = texcoord.yx;
    }

    vec2 tileCoord = (vec2(tile.xy) + texcoord) / u_tilesetSize;
    vec4 color = texture(u_tiles, tileCoord);
    if (color.a <= 0.1) {
      discard;
    }
    fragColor = color;
  }
`;

let s_tileProgramInfo;
let s_tileBufferInfo;
let s_tileVAInfo;

const setupTileModel = function(gl) {
  if (s_tileBufferInfo) {
    return;
  }

  s_tileProgramInfo = twgl.createProgramInfo(gl, [s_tileVertexShader, s_tileFragmentShader]);
  s_tileBufferInfo = twgl.createBufferInfoFromArrays(gl, {
    position: {
      numComponents: 2,
      data: [
        0, 0,
        1, 0,
        0, 1,
        1, 1,
      ],
    },
    texcoord: [
      0, 0,
      1, 0,
      0, 1,
      1, 1,
    ],
    indices: [
      0, 1, 2,
      2, 1, 3,
    ],
  });

  s_tileVAInfo = twgl.createVertexArrayInfo(gl, s_tileProgramInfo, s_tileBufferInfo);
};

/**
 * @typedef {Object} Tileset
 * @property {number} tilesAcross
 * @property {number} tilesDown
 * @property {number} tileWidth
 * @property {number} tileHeight
 * @property {WebGLTexture} texture
 */

/**
 * @typedef {Object} TileMapOptions
 * @property {number} mapTilesAcross number of tiles across map
 * @property {number} mapTilesDown number of tiles down map
 * @property {Tileset} tileset
 * @property {Uint8Array} tilemap Uint8Array tilemap where each tile is 4 bytes.
 *      first byte is tile across
 *      second byte is tile down
 *      3rd byte unused
 *      4th byte are flags
 *          0x80 = flip horizontal
 *          0x40 = flip vertical
 *          0x20 = swap x and y
 *
 *      In other words if your tile texture is
 *
 *      +--+--+--+
 *      |  |  |  |
 *      +--+--+--+
 *      |  |  |AB|
 *      +--+--+--+
 *
 *      and you want tile 'AB' you'd need to put 0x02,0x01,0x00,0x00 in your tilemap.
 *
 * todo:
 *   Add some flags to let you:
 *     choose a z-level per tile?
 */

/**
 * @typedef {Object} TileMapOptions
 * @property {number} x where to draw in pixels
 * @property {number} y where to draw in pixels
 * @property {number} width amount to draw in pixels
 * @property {number} height amount to draw in pixels
 * @property {number} canvasWidth  size of canvas
 * @property {number} canvasHeight size of canvas
 * @property {number} originX point to scale and rotate around
 * @property {number} originY point to scale and rotate around
 * @property {number} scrollX pixel position to scroll map. This pixel of the map will be at the origin.
 * @property {number} scrollY pixel position to scroll map
 * @property {number} scaleX 1.0 = 1 pixel = 1 pixel
 * @property {number} scaleY 1.0 = 1 pixel = 1 pixel
 * @property {number} rotation in Radians
 */

export default class TileMap {
  /**
   * Class to help draw a TileMap
   * @param {WebGL2RenderingContext} gl
   * @param {TileMapOptions} options
   */
  constructor(gl, options) {
    this.tilemapTextureOptions = {
      width: options.mapTilesAcross,
      height: options.mapTilesDown,
      src: options.tilemap,
      internalFormat: gl.RGBA8UI,
      minMag: gl.NEAREST,
    };
    this.tilemap = options.tilemap;
    this.tilemapTexture = twgl.createTexture(gl, this.tilemapTextureOptions);

    setupTileModel(gl);

    this.tileset = options.tileset;

    this.tilemapSize = [options.mapTilesAcross, options.mapTilesDown];
    this.tilesetSize = [options.tileset.tilesAcross, options.tileset.tilesDown];
    this.mapOffset = [0, 0];
    this.matrix = m4.copy([
      2,  0,  0,  0,
      0, -2,  0,  0,
      0,  0,  1,  0,
     -1,  1,  0,  1,
    ]);
    this.texMatrix = m4.identity();
    this.uniforms = {
      u_tilemapSize: this.tilemapSize,
      u_tilesetSize: this.tilesetSize,
      u_mapOffset: this.mapOffset,
      u_matrix: this.matrix,
      u_texMatrix: this.texMatrix,
      u_tilemap: this.tilemapTexture,
      u_tiles: options.tileset.texture,
    };

    this.originMat = m4.identity();
    this.scalingMat = m4.identity();
    this.translationMat = m4.identity();
    this.rotationMat = m4.identity();
    this.workMat = m4.identity();
  }

  uploadTilemap(gl) {
    twgl.setTextureFromArray(gl, this.tilemapTexture, this.tilemap, this.tilemapTextureOptions);
  }

  /**
   * @param {WebGL2RenderingContext} gl
   * @param {TileMapDrawOptions} options
   */
  draw(gl, options) {
    if (options.tiles) {
      this.textures.u_tiles = options.tiles;
    }

    const scaleX = options.scaleX || 1;
    const scaleY = options.scaleY || 1;

    const dispScaleX = options.width / options.canvasWidth;
    const dispScaleY = options.height / options.canvasHeight;

    m4.translation(
      [ -options.originX / options.canvasWidth,
        -options.originY / options.canvasHeight,
         0,
      ],
      this.originMat);
    m4.scaling(
      [ options.canvasWidth  / this.tileset.tileWidth  / scaleX * (dispScaleX),
        options.canvasHeight / this.tileset.tileHeight / scaleY * (dispScaleY),
        1,
      ],
      this.scalingMat);
    m4.translation([options.scrollX, options.scrollY, 0], this.translationMat);
    m4.rotationZ(options.rotation, this.rotationMat);
    const mat = this.texMatrix;
    m4.identity(mat);

    m4.multiply(mat, this.translationMat, mat);
    m4.multiply(mat, this.rotationMat, mat);
    m4.multiply(mat, this.scalingMat, mat);
    m4.multiply(mat, this.originMat, mat);

    this.matrix[ 0] =  2 * dispScaleX;
    this.matrix[ 5] = -2 * dispScaleY;
    this.matrix[12] = -1 + 2 * options.x / options.canvasWidth;
    this.matrix[13] =  1 - 2 * options.y / options.canvasHeight;

    gl.useProgram(s_tileProgramInfo.program);
    gl.bindVertexArray(s_tileVAInfo.vertexArrayObject);
    twgl.setUniforms(s_tileProgramInfo, this.uniforms);
    twgl.drawBufferInfo(gl, s_tileVAInfo);
  }
}