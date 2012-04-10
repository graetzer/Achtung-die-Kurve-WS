package controllers

import scala.collection.mutable.LinkedList
import play.api.libs.iteratee.Enumerator
import play.api.libs.iteratee.Iteratee
import play.api.mvc.Action
import play.api.mvc.Controller
import play.api.mvc.WebSocket
import play.api.Logger
import views._
import models._
import play.api.libs.json._

object Application extends Controller{
  
  def index = Action {
    Ok(html.index("abc"))
  }
  
  def offline = Action {Ok(html.offline())}
  
  def online = Action {Ok(html.online())}
  
  def connect(name:String) = WebSocket.async[String] { r =>
    Logger.info(name);
    Game.connect(name);
  }
  
  def list = Action {
      val data = JsArray(Game.games.map{name => Json.toJson(Map("name" -> name))})
      Ok(data);
   }
}