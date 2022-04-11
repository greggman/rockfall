/* eslint-env browser */

import {
  kUpBit,
  kDownBit,
  kLeftBit,
  kRightBit,
  kFireBit,
} from './input.js';

const mappings = {
  standard: {
    buttons: { left: 14, right: 15, up: 12, down: 13, buttonA: 1, buttonB: 0 }, axes: { upDown: 1, leftRight: 0 },
  },
  // This was my wired xbox controller on OSX Firefox 38
  unknown: {
    buttons: { left: 13, right: 14, up: 11, down: 12, buttonA: 0, buttonB: 1 }, axes: { upDown: 1, leftRight: 0 },
  },
};

function getMapping(mapping) {
  return mappings[mapping] || mappings.unknown;
}

function getAxis(axes, mapping) {
  return axes[mapping] || 0;
}

function getButton(buttons, mapping) {
  return buttons[mapping] ? buttons[mapping].pressed : false;
}

class GamepadController {
  constructor(gamepad, mapping) {
    this._gamepad = gamepad;
    this._mapping = mapping;
    this._bits = 0;
  }
  setGamepad(gamepad) {
    this._gamepad = gamepad;
  }
  process() {
    const gamepad = this._gamepad;
    const mapping = this._mapping;
    const buttonMapping = mapping.buttons;
    const axesMapping   = mapping.axes;
    const buttons       = gamepad.buttons;
    const axes          = gamepad.axes;
    const xAxis = getAxis(axes, axesMapping.leftRight);
    const yAxis = getAxis(axes, axesMapping.upDown);
    const bits =
      ((getButton(buttons, buttonMapping.left   ) || xAxis < -0.5) ? kLeftBit  : 0) | // left
      ((getButton(buttons, buttonMapping.right  ) || xAxis >  0.5) ? kRightBit : 0) | // right
      ((getButton(buttons, buttonMapping.up     ) || yAxis < -0.5) ? kUpBit    : 0) | // up
      ((getButton(buttons, buttonMapping.down   ) || yAxis >  0.5) ? kDownBit  : 0) | // down
      (getButton(buttons, buttonMapping.buttonA)                   ? kFireBit  : 0);
    this._bits = bits;
  }
  get bits() {
    return this._bits;
  }
}

export class GamepadManager {
  constructor() {
    this._handleConnect = this._handleConnect.bind(this);
    this._handleDisconnect = this._handleDisconnect.bind(this);
    this._processController = this._processController.bind(this);

    this._controllers = {};

    window.addEventListener('gamepadconnected', this._handleConnect);
    window.addEventListener('gamepaddisconnected', this._handleDisconnect);
  }
  _addControllerForGamepadIfNew(gamepad) {
    const controller = this._controllers[gamepad.index];
    if (!controller) {
      this._addGamepad(gamepad);
    } else {
      controller.setGamepad(gamepad);
    }
  }
  _handleConnect(e) {
    this._addControllerForGamepadIfNew(e.gamepad);
  }

  _handleDisconnect(e) {
    this._removeGamepad(e.gamepad);
  }

  _addGamepad(gamepad) {
    const mapping = getMapping(gamepad.mapping);
    const controller = new GamepadController(gamepad, mapping);
    this._controllers[gamepad.index] = controller;
    return controller;
  }

  _removeGamepad(gamepad) {
    delete this._controllers[gamepad.index];
  }

  _processController(index) {
    const gamepad = this._controllers[index];
    gamepad.process();
  }

  getBits(p) {
    const c = this._controllers[p];
    return c ? c.bits : 0;
  }

  process() {
    if (!navigator.getGamepads) {
      return;
    }
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      if (gamepad) {
        this._addControllerForGamepadIfNew(gamepad);
      }
    }
    // FIX: Object.keys makes a new array.
    Object.keys(this._controllers).forEach(this._processController);
  }
}

