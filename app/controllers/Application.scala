package controllers

import scala.collection.mutable.LinkedList
import play.api.libs.iteratee.Enumerator
import play.api.libs.iteratee.Iteratee
import play.api.mvc.Action
import play.api.mvc.Controller
import play.api.mvc.WebSocket
import play.api.Logger

import views._

object IDGen {
  private var currentID:Int = -1
  def genID:Int = {currentID += 1;currentID}
}
case class Player(id:Int, name:String, alive:Boolean)
case class Game(id:Int, title:String, players:LinkedList[Player])

object Application extends Controller{
  
  def index = Action {
    Ok(html.index("abc"))
  }
  
  def singleplayer = Action {Ok(html.singleplayer())}
  
  def multiplayer = Action {Ok(html.multiplayer())}
  
  def gameHub(username:String, gameID:Int) = WebSocket.using[String] { request => 
  
  // Log events to the console
  val in = Iteratee.foreach[String](println).mapDone { _ =>
    Logger.info("Disconnected")
  }
  
  // Send a single 'Hello!' message
  val out = Enumerator("Hello!")
  
  (in, out)
}
}