import { useState, useEffect } from "react";
import PreMatchInformation from "./Scenes/preMatchInformation";
import Obs, { useObsWebSocket } from "./Api/useObsWebSocket";
import { useScoringSystemWebSocket } from "./Api/useScoringSystemWebSocket";
import { UpdateMessage } from "./Types/UpdateMessage";
import { Ranking } from "./Types/Ranking";
import { FreightFrenzyMatchDetailed } from "./types/FreightFrenzyMatchDetailed";
import Randomization from "./Scenes/randomization";
import { SceneOptions } from "./Types/SceneOptions";
import MatchPlay from "./scenes/matchPlay";
import MatchResults from "./scenes/matchResults";
import { useInterval } from "./hooks/useInterval";
import { MatchDetailed } from "./Types/MatchDetailed";
import { useTimer } from "react-timer-hook";

export default function App() {
  //const SCORING_SYSTEM_IP = `${process.env.REACT_APP_SCORING_SYSTEM_IP}`;
  const SCORING_SYSTEM_IP = `localhost`;
  const API_KEY = `JVKGUvXqwkNyJXlsQiEjihfZIFjGtQXI`;
  //const SCORING_SYSTEM_EVENT_CODE = `${process.env.REACT_APP_SCORING_SYSTEM_EVENT_CODE}`;
  const SCORING_SYSTEM_EVENT_CODE = `test`;
  const OBS_IP = `${process.env.REACT_APP_OBS_IP}`;
  const OBS_PASSWORD = `${process.env.REACT_APP_OBS_PASSWORD}`;
  const [rankingList, setRankingList] = useState<Ranking[]>([]);
  const [activeMatchNumber, setActiveMatchNumber] = useState<number>(1);
  const [activeMatch, setActiveMatch] = useState<FreightFrenzyMatchDetailed>();
  const [scene, setScene] = useState<SceneOptions>();
  const [randomization, setRandomization] = useState<number>();
  const [activeMatchResults, setActiveMatchResults] = useState<MatchDetailed>();
  const expiryTimestamp = new Date();
  expiryTimestamp.setSeconds(expiryTimestamp.getSeconds() + 150);
  const { seconds, minutes, start, pause, resume, restart } = useTimer({
    expiryTimestamp,
  });
  const myHeaders = new Headers();
  myHeaders.append("Authorization", API_KEY);
  const myInit = {
    headers: myHeaders
  };


  useEffect(() => {
    if (minutes === 2 && seconds === 0) {
      pause();
      setTimeout(() => {
        resume();
      }, 1000);
    }
  }, [seconds, minutes]);

  const lastMessage: UpdateMessage = useScoringSystemWebSocket(
    SCORING_SYSTEM_IP!,
    SCORING_SYSTEM_EVENT_CODE!
  );
  useObsWebSocket(Obs, OBS_IP!, OBS_PASSWORD!);
  useInterval(() => {
    fetch(
      `http://${SCORING_SYSTEM_IP}/api/2023/v1/events/${SCORING_SYSTEM_EVENT_CODE}/matches/${activeMatchNumber}/`, myInit
    )
      .then((res) => res.json())
      .then(
        (result: FreightFrenzyMatchDetailed) => {
          console.log("Looped for match ", activeMatchNumber, result);
          setActiveMatch(result);
          setRandomization(result.randomization);
        },
        (error) => {
          setScene(SceneOptions.AudienceDisplay);
        }
      );
  }, 4000);

  useInterval(() => {
    fetch(
      `http://${SCORING_SYSTEM_IP}/api/v1/events/${SCORING_SYSTEM_EVENT_CODE}/rankings/`, myInit
    )
      .then((res) => res.json())
      .then(
        (result) => {
          console.log("Looped for ranking ", activeMatchNumber, result);
          setRankingList(result.rankingList);
        },
        (error) => {
          setScene(SceneOptions.AudienceDisplay);
        }
      );
  }, 10000);

  useEffect(() => {
    fetch(
      `http://${SCORING_SYSTEM_IP}/api/v1/events/${SCORING_SYSTEM_EVENT_CODE}/rankings/`, myInit
    )
      .then((res) => res.json())
      .then(
        (result) => {
          console.log("Looped for ranking ", activeMatchNumber, result);
          setRankingList(result.rankingList);
        },
        (error) => {
          setScene(SceneOptions.AudienceDisplay);
        }
      );
  }, []);

  useEffect(() => {
    if (lastMessage !== null) {
      console.log("Last Message", lastMessage);
      console.log(
        "setting active match number as ",
        lastMessage.payload.number
      );
      setActiveMatchNumber(lastMessage.payload.number);
      switch (lastMessage.updateType) {
        case "MATCH_LOAD":
          break;
        case "MATCH_START":
          restart(expiryTimestamp);
          start();
          setScene(SceneOptions.MatchPlay);
          break;
        case "MATCH_ABORT":
          break;
        case "MATCH_COMMIT":
          break;
        case "MATCH_POST":
          getMatchResults();
          setScene(SceneOptions.MatchResults);
          break;
      }
      console.log("Setting field");
      Obs.send("SetCurrentScene", {
        "scene-name": "Field " + lastMessage.payload.field,
      });
    }
  }, [lastMessage]);

  useEffect(() => {
    if (activeMatch) {
      if (activeMatch.matchBrief.matchState === "RANDOMIZED") {
        setScene(SceneOptions.Randomization);
      }
      if (activeMatch.matchBrief.matchState === "UNPLAYED") {
        setScene(SceneOptions.PreMatchInformation);
      }
    }
  }, [activeMatch]);

  const setAudienceDisplay = () => {
    Obs.send("SetCurrentScene", {
      "scene-name": "Audience Display",
    });
  };

  const getMatchResults = () => {
    fetch(
      `http://${SCORING_SYSTEM_IP}/api/v1/events/${SCORING_SYSTEM_EVENT_CODE}/matches/${activeMatchNumber}/`, myInit
    )
      .then((res) => res.json())
      .then(
        (result) => {
          setActiveMatchResults(result);
        },
        (error) => {
          setScene(SceneOptions.AudienceDisplay);
        }
      );
  };

  /*const key = () => {
    fetch(
        `http://${SCORING_SYSTEM_IP}/api/v1/keyrequest/?name=scorekeeper-visual`
    )
        .then(
            (result) => {console.log("result", result.json())}
        )
  }*/
  const sceneDisplay = () => {
    console.log("Scene", scene)
    switch (scene) {
      case "Randomization":
        return <Randomization randomization={randomization!} />;
      case "PreMatchInformation":
        return (
          <PreMatchInformation
            rankingList={rankingList!}
            activeMatch={activeMatch!}
          />
        );
      case "MatchPlay":
        return (
          <MatchPlay
          rankingList={rankingList!}
            activeMatch={activeMatch!}
            seconds={seconds}
            minutes={minutes}
          />
        );
      case "MatchResults":
        return <MatchResults activeMatchResults={activeMatchResults!} />;
      case "AudienceDisplay":
        setAudienceDisplay();
        return <h1>Showing Audience Display</h1>;
      default:
        setAudienceDisplay();
        return <h1>Showing Audience Display</h1>;
    }
  };

  return <div>{sceneDisplay()}</div>;
}
