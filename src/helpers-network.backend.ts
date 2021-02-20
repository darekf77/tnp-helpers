import * as express from 'express';
import * as http from 'http';
import * as https from 'https';
export { Application, Request, Response } from 'express';
import { Application, Request, Response } from 'express';

export class HelpersNetwork {
  from(app: express.Application) {
    return {
      handle(respond: (
        req: any, // http.IncomingMessage, //http.IncomingMessage & express.Request,
        res: any, // http.ServerResponse, //http.ServerResponse & express.Response
      ) => void, networkPath?: string | RegExp) {
        if (!networkPath) {
          networkPath = /^\/(.*)/;
        }
        app.get(networkPath, (req, res) => {
          respond(req, res);
        });
        app.post(networkPath, (req, res) => {
          respond(req, res);
        });
        app.delete(networkPath, (req, res) => {
          respond(req, res);
        });
        app.put(networkPath, (req, res) => {
          respond(req, res);
        });
        app.head(networkPath, (req, res) => {
          respond(req, res);
        });
        app.patch(networkPath, (req, res) => {
          respond(req, res);
        });
        app.trace(networkPath, (req, res) => {
          respond(req, res);
        });
        app.options(networkPath, (req, res) => {
          respond(req, res);
        });
        app.connect(networkPath, (req, res) => {
          respond(req, res);
        });
      }
    }
  }

}
