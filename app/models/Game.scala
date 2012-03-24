package models

import akka.actor._
import akka.util.duration._
import play.api._
import play.api.libs.json._
import play.api.libs.iteratee._
import play.api.libs.concurrent._
import akka.util.Timeout
import akka.pattern.ask
import play.api.Play.current
import scala.collection.mutable.ListMap
import scala.collection.mutable.ListBuffer

object Game {
  implicit val timeout = Timeout(1 second)
  private var gID:Int = -1
  private val gameNames = ListMap.empty[Int, String]
  private val gameActors = ListMap.empty[Int, ActorRef] 
  def games:Iterable[String] = gameNames.values
  
  def create(gameTitle:String, playerName:String) = {
    val game = Akka.system.actorOf(Props[Game])
    gID += 1
    gameActors += ( (gID, game) )
    gameNames += ((gID, playerName))
    join(gID, playerName)
  }
  
  def join(id:Int, playerName:String): Promise[(Iteratee[String, _], Enumerator[String])] = {
    val game = gameActors(id)
    (game ? Join(playerName)).asPromise.map {
      case Connected(pID, enumerator) => {
         val iteratee = Iteratee.foreach[String] { event =>
          game ! Update(event)
        }.mapDone { _ =>
          game ! Quit(pID)
        }
        (iteratee,enumerator)
      }
      case Error => {
        val iteratee = Done[String,Unit]((),Input.EOF)
        
        val msg = JsObject(Seq("error" -> JsString("error")))
        // Send an error and close the socket
        val enumerator =  Enumerator[String](Json.stringify(msg)).andThen(Enumerator.enumInput(Input.EOF))
        
        (iteratee,enumerator)

      }
    }
  }
}

class Game extends Actor {
  private val members = ListBuffer.empty[(Player, PushEnumerator[String])]
  def receive = {
    case Join(name) => {
      val p = Player(name, true)
      val e = Enumerator.imperative[String](onStart = Logger.info("Player %s joined".format(name)))
      members += ((p,e))
    }
    case Update(msg) => notfiyAll(msg)
    case Quit(id) => {
      val (p, _) = members(id)
     }
    case _ => Logger.error("Unhandled message")
  }
  
  def notfiyAll(msg:String) = members.map {case (p, e) => e.push(msg)}
}

case class Player(name:String, alive:Boolean)

abstract class GameRequest
case class Join (username:String) extends GameRequest
case class Quit(id:Int) extends GameRequest
case class Update(msg:String) extends GameRequest

abstract class GameResponse
case class Connected(id:Int, e:Enumerator[String]) extends GameResponse
case object Error extends GameResponse