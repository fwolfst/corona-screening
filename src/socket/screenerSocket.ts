import { io, studentQueue } from "../server";
import { EventEmitter } from "events";
import LoggerService from "../utils/Logger";
const Logger = LoggerService("screenerSocket.ts");

export const ScreenerEmitter = new EventEmitter();

enum screenerSocketEvents {
  LOGIN = "loginScreener",
  LOGOUT = "logoutScreener",
}

export enum screenerEmitterEvents {
  UPDATE_SCREENER = "screenerUpdate",
  STUDENT_LOGIN = "studentLogin",
}

enum screenerSocketActions {
  UPDATE_QUEUE = "updateQueue",
  UPDATE_SCREENER = "screenerUpdate",
}

const SCREENER_CHANNEL = "screener";

interface ScreenerInfo {
  firstname: string;
  lastname: string;
  email: string;
}

const allScreener: Map<string, string> = new Map([]);
export let onlineScreenerList: ScreenerInfo[] = [];

const startScreenerSocket = () => {
  const subcriber = studentQueue.getClient().duplicate();
  subcriber.subscribe("queue");

  const addScreener = (screener: ScreenerInfo): void => {
    if (!onlineScreenerList.some((s) => s.email === screener.email)) {
      onlineScreenerList.push(screener);
    }

    ScreenerEmitter.emit(
      screenerEmitterEvents.UPDATE_SCREENER,
      onlineScreenerList.length
    );
    io.sockets
      .in(SCREENER_CHANNEL)
      .emit(screenerSocketActions.UPDATE_SCREENER, onlineScreenerList);
  };

  const removeScreener = (email: string): void => {
    const newList: ScreenerInfo[] = [];
    for (const screener of onlineScreenerList) {
      if (screener.email !== email) {
        newList.push(screener);
      }
    }

    onlineScreenerList = newList;

    // notify Students in Queue
    ScreenerEmitter.emit(screenerEmitterEvents.UPDATE_SCREENER, newList.length);
    io.sockets
      .in(SCREENER_CHANNEL)
      .emit(screenerSocketActions.UPDATE_SCREENER, newList);
  };

  io.on("connection", (socket) => {
    socket.on(screenerSocketEvents.LOGIN, async (data) => {
      if (!data) {
        return;
      }

      allScreener.set(socket.id, data.email);

      const jobList = await studentQueue.listInfo();
      socket.join(SCREENER_CHANNEL);
      // send current status of Jobs to Screener
      socket.emit(screenerSocketActions.UPDATE_QUEUE, jobList);
      addScreener(data);

      Logger.info(`New Screener Login from ${data.email}`);
    });

    socket.on("disconnect", async () => {
      if (allScreener.get(socket.id)) {
        const email = allScreener.get(socket.id);
        allScreener.delete(socket.id);
        removeScreener(email);
        Logger.info(`Screener ${email} disconnected.`);
      }
    });
    socket.on("screener-reconnect", async (data) => {
      if (!data) {
        return;
      }

      allScreener.set(socket.id, data.email);

      const jobList = await studentQueue.listInfo();
      socket.join(SCREENER_CHANNEL);
      // send current status of Jobs to Screener
      socket.emit(screenerSocketActions.UPDATE_QUEUE, jobList);
      addScreener(data);

      Logger.info(`Screener ${data.email} reconnected.`);
    });

    socket.on(screenerSocketEvents.LOGOUT, async (data: ScreenerInfo) => {
      allScreener.delete(socket.id);
      removeScreener(data.email);
      Logger.info(`Screener ${data.email} logged out!`);
    });
  });

  subcriber.on("message", async () => {
    // screener is notified in everytime when the queue changes (we dont need to check what changed)
    const jobList = await studentQueue.listInfo();
    io.sockets
      .in(SCREENER_CHANNEL)
      .emit(screenerSocketActions.UPDATE_QUEUE, jobList);
  });
};

export default startScreenerSocket;
