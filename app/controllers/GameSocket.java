package controllers;

import play.*;
import play.mvc.Http.WebSocketClose;
import play.mvc.Http.WebSocketEvent;
import play.mvc.Http.WebSocketFrame;
import play.mvc.WebSocketController;
import static play.libs.F.*;
import static play.libs.F.Matcher.*;
import static play.mvc.Http.WebSocketEvent.*;

public class GameSocket extends WebSocketController {

	/** The live stream. */
	public static play.libs.F.EventStream<String> liveStream = new play.libs.F.EventStream<String>();

	public static void distribute() {
		while (inbound.isOpen()) {
			
			Either<WebSocketEvent, String> e = await(Promise.waitEither(
                    inbound.nextEvent(), 
                    liveStream.nextEvent()
                ));
			
			for (@SuppressWarnings("unused")
			String quit : TextFrame.and(Equals("quit")).match(e._1)) {
				Logger.info("Quit connection");
				outbound.send("Bye!");
				disconnect();
				Logger.info("Socket closed!");
			}
			
			for(String msg: TextFrame.match(e._1)) {
	             liveStream.publish(msg);
	         }
			
			for (@SuppressWarnings("unused")
			WebSocketClose closed : SocketClosed.match(e._1)) {
				Logger.info("Socket closed!");
			}
			
			if(e._2.isDefined()) {
				outbound.send(e._2.get());
			}

//			for(String msg : String.match(e._2)) {
//				Logger.info("Send message");
//				outbound.send(msg);
//			}
		}
	}

}
