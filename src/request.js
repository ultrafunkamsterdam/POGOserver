import fs from "fs";
import url from "url";
import jwtDecode from "jwt-decode";
import POGOProtos from "pokemongo-protobuf";

import print from "./print";
import CFG from "../cfg";

import { deXOR, getHashCodeFrom } from "./utils";

/**
 * @param {Request} req
 * @param {Response} res
 */
export function routeRequest(req, res) {

  let parsed = url.parse(req.url).pathname;
  let route = parsed.split("/");
  let host = req.headers.host;

  switch (route[1]) {
    case "plfe":
    case "custom":
      this.processRpcRequest(req, res, route);
    break;
    case "model":
      this.processModelRequest(req, res, route);
    break;
    case "api":
      if (!CFG.ENABLE_API) return void 0;
      if (req.method === "POST") {
        this.processApiCall(req, res, route);
      }
    break;
    default:
      console.log(`Unknown request url: https://${host}${req.url}`);
    break;
  };

}

/**
 * @param {Request} req
 * @param {Response} res
 * @param {Array} route
 */
export function processModelRequest(req, res, route) {

  let player = this.world.getPlayerByRequest(req, res);

  // make sure no random dudes can access download
  if (!player.authenticated) return void 0;
  let name = route[2];
  if (name && name.length > 1) {
    let folder = player.isAndroid ? "android/" : "ios/";
    fs.readFile("data/" + folder + name, (error, data) => {
      if (error) {
        print(`Error file resolving model ${name}:` + error, 31);
        return void 0;
      }
      print(`Sent ${name} to ${player.email}`, 36);
      res.end(data);
    });
  }

}

/**
 * @param {Request} req
 * @param {Response} res
 * @param {Array} route
 */
export function processRpcRequest(req, res, route) {
  let player = this.world.getPlayerByRequest(req, res);
  if (route[2] === "rpc") {
    player.refreshSocket(req, res);
    this.onRequest(player);
  }
}

/**
 * @param {Player} player
 */
export function onRequest(player) {

  let request = player.request;
      request.requests = request.requests || [];

  if (CFG.DEBUG_LOG_REQUESTS) {
    print("#####");
    request.requests.map((request) => {
      print(request.request_type, 35);
    }).join(",");
  }

  if (!player.authenticated) {
    this.authenticatePlayer(player);
    return void 0;
  }

  if (player.hasSignature === false) {
    player.getDevicePlatform();
  }

  if (!request.requests.length) {
    print("Received invalid request!", 31);
    return void 0;
  }

  this.processRequests(player, request.requests).then((returns) => {
    if (CFG.DEBUG_DUMP_TRAFFIC) {
      this.dumpTraffic(request, returns);
    }
    let msg = this.envelopResponse(returns, request, player);
    player.sendResponse(msg);
  });

}

/**
 * @param  {Array} returns
 * @param  {Request} request
 * @param  {Player} player
 * @return {Buffer}
 */
export function envelopResponse(returns, request, player) {

  let buffer = request;

  delete buffer.requests;

  buffer.returns = returns;

  if (request.auth_ticket) {
    print("Authenticate!", 31);
    buffer.auth_ticket = AuthTicket();
  }

  if (buffer.unknown6) {
    buffer.unknown6 = [{
      "response_type": 6,
      "unknown2": {
        "unknown1": "1",
        "items": [],
        "player_currencies": []
      }
    }];
  }

  buffer.status_code = 1;

  return (
    POGOProtos.serialize(buffer, "POGOProtos.Networking.Envelopes.ResponseEnvelope")
  );

}

/**
 * @param {Player} player
 */
export function authenticatePlayer(player) {

  let request = player.request;
  let token = request.auth_info;
  let msg = player.GetAuthTicket(request.request_id);

  if (!token || !token.provider) {
    print("Invalid authentication token! Kicking..", 31);
    player.world.removePlayer(player);
    return void 0;
  }

  if (token.provider === "google") {
    if (token.token !== null) {
      let decoded = jwtDecode(token.token.contents);
      player.email = decoded.email;
      player.email_verified = decoded.email_verified;
      player.isGoogleAccount = true;
      print(`${player.email} connected!`, 36);
    }
    else {
      print("Invalid authentication token! Kicking..", 31);
      player.world.removePlayer(player);
      return void 0;
    }
  }
  else {
    print("Invalid provider! Kicking..", 31);
    player.world.removePlayer(player);
    return void 0;
  }

  player.authenticated = (
    deXOR(this.hash, getHashCodeFrom(this.claim)) === this.repository
  );
  player.sendResponse(msg);

}

/**
 * @param  {Player} player
 * @param  {Array} requests
 * @return {Array}
 */
export function processRequests(player, requests) {

  return new Promise((resolve) => {

    let index = 0;
    let length = requests.length;
    let body = [];

    const loop = (index) => {
      this.processResponse(player, requests[index]).then((request) => {
        body.push(request);
        if (++index >= length) resolve(body);
        else return loop(index);
      });
    };

    loop(0);

  });

}