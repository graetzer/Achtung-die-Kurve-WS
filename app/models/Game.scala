package models

import akka.actor._
import akka.util.duration._
import play.api._
import play.api.libs.json._
import play.api.libs.json.Json._
import play.api.libs.iteratee._
import play.api.libs.concurrent._
import akka.util.Timeout
import akka.pattern.ask
import play.api.Play.current
import scala.collection.mutable.ListMap
import scala.collection.mutable.ListBuffer
import scala.math.random

private object Gen {
  private var currentID:Int = -1
  def ID:Int = {currentID += 1;currentID}
  def salt:String = Integer.toHexString((random*currentID*1000).toInt)
}

object GameMap extends ListMap[String, ActorRef]
class GameMap extends ListMap[String, ActorRef] {
  override def default(key:String):ActorRef = {
    val gameActor = Akka.system.actorOf(Props(new Game(key)))
    this += key -> gameActor
    gameActor
  } 
}

object Game {
  implicit val timeout = Timeout(1 second)
  private val gameActors = GameMap.empty
  def games = gameActors.toSeq.map{case (name, actor) => name}
  
  def delete (name:String) {gameActors(name) ! PoisonPill; gameActors -= name} 
  
  def connect(name:String):Promise[(Iteratee[String, Unit], Enumerator[String])] = {
    val game = gameActors(name)
    (game ? Connect).asPromise.map {
      case Connected(mID, enumerator) => {
         val iteratee = Iteratee.foreach[String] { event =>
          game ! (mID, event)
        }.mapDone { _ =>
          game ! Quit(mID)
        }
        (iteratee,enumerator)
      }
      case Error(message) => {
        val iteratee = Done[String,Unit]((),Input.EOF)
        val msg = JsObject(Seq("type" -> JsNumber(0), "error" -> JsString(message)))
        // Send an error and close the socket
        val enumerator =  Enumerator[String](Json.stringify(msg)).andThen(Enumerator.enumInput(Input.EOF))
        (iteratee,enumerator)
      }
    }
  }
}

class Game(name:String) extends Actor {
  private val members = ListMap.empty[Int, PushEnumerator[String]]
  def receive = {
    case Connect => {
      val id = Gen.ID
      val e = Enumerator.imperative[String](onStart = Logger.info("Member %d joined game %s".format(id, name)),
          onError = {case (msg, _) => sender ! Error(msg); Logger.error(msg)});
          
      members += id -> e
      sender ! Connected(id, e)
    }
    case Message(id, msg) => notfiyAll(msg)
    case Quit(id) => {
      members -= id
      if (members.size == 0) {
        Game.delete(name)
        context.stop(self)
      } 
     }
    case _ => Logger.error("Unhandled message")
  }
  
  def notfiyAll(msg:String) = members.map {case (_, e) => e.push(msg)}
}

case class Player(id:Int, name:String)

abstract class GameRequest
case object Connect extends GameRequest
case class Quit(memberID:Int) extends GameRequest
case class Message(memberID:Int, msg:String) extends GameRequest

abstract class GameResponse
case class Connected(memberID:Int, e:Enumerator[String]) extends GameResponse
case class Error(message:String) extends GameResponse