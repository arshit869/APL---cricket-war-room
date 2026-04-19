const teams = { RCB: "RCB", DC: "DC" };

function generateMatchScript() {
  const script = [];
  let score = 0;
  let wickets = 0;

  for (let over = 0; over < 20; over++) {
    for (let ball = 1; ball <= 6; ball++) {
      let type = "dot";
      let runs = 0;
      let player = "Batsman";
      let isWicket = false;

      // Narrative logic
      if (over < 4) {
        // Kohli blitz
        player = "Kohli";
        const rand = Math.random();
        if (rand > 0.6) { type = "four"; runs = 4; }
        else if (rand > 0.8) { type = "six"; runs = 6; }
        else if (rand > 0.3) { type = "single"; runs = 1; }
      } else if (over === 4 && ball === 6) {
        // Powerplay ends 60/0
        runs = 60 - score;
        if (runs > 0) type = runs >= 4 ? (runs === 6 ? "six" : "four") : "boundary";
      } else if (over >= 5 && over <= 7) {
        if (over === 6 && ball === 3) {
          type = "wicket";
          isWicket = true;
          player = "Kohli";
        } else {
          type = Math.random() > 0.5 ? "dot" : "single";
          runs = type === "single" ? 1 : 0;
        }
      } else if (over >= 8 && over <= 11) {
        // 3 wickets
        if (over === 8 && ball === 2) { type = "wicket"; isWicket = true; player = "Patidar"; }
        else if (over === 10 && ball === 4) { type = "wicket"; isWicket = true; player = "Green"; }
        else if (over === 11 && ball === 6) { type = "wicket"; isWicket = true; player = "Lomror"; }
        else { type = "single"; runs = 1; }
      } else if (over >= 12 && over <= 15) {
        // Maxwell cameo
        player = "Maxwell";
        const rand = Math.random();
        if (rand > 0.5) { type = "six"; runs = 6; }
        else { type = "single"; runs = 1; }
      } else if (over === 18) { // Over 19 (index 18)
        // Hat-trick
        if (ball === 2) { type = "wicket"; isWicket = true; player = "Karthik"; }
        else if (ball === 3) { type = "wicket"; isWicket = true; player = "Rawat"; }
        else if (ball === 4) { type = "wicket"; isWicket = true; player = "Siraj"; }
        else { type = "dot"; runs = 0; }
      } else if (over === 19) { // Over 20
        if (ball === 6) {
          type = "six"; runs = 6; player = "Ferguson";
        } else {
          type = "single"; runs = 1;
        }
      } else {
        const rand = Math.random();
        if (rand > 0.8) { type = "four"; runs = 4; }
        else if (rand > 0.5) { type = "single"; runs = 1; }
      }

      if (isWicket) wickets++;
      else score += runs;

      script.push({
        over: over + 1,
        ball,
        type,
        runs,
        player,
        team: teams.RCB,
        score,
        wickets,
        isWicket
      });
    }
  }
  return script;
}

export const matchScript = generateMatchScript();
