const buildInspectionDates = (now = new Date(), monthCount = 6) => {
  const dates = [];
  for (let monthsAgo = monthCount; monthsAgo >= 1; monthsAgo -= 1) {
    const month = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    [9, 23].forEach((day) => {
      const date = new Date(month.getFullYear(), month.getMonth(), day);
      dates.push([
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
      ].join("-"));
    });
  }
  return dates;
};

const checklist = [
  ["encroachment", "A. Encroachment", "A", "Encroachment review"],
  ["fire-protection", "B. Fire Protection Systems", "1.0", "Main Fire Alarm Panel"],
  ["fire-protection", "B. Fire Protection Systems", "1.2", "Zone Indicators"],
  ["fire-protection", "B. Fire Protection Systems", "2.2", "Call point intact / last tested"],
  ["fire-protection", "B. Fire Protection Systems", "2.3", "Smoke detectors fully operational"],
  ["hosereel", "C. Fire Hosereel System", "3.0", "Fire Hosereel serviceable"],
  ["hosereel", "C. Fire Hosereel System", "3.1", "Obstruction to fire hose reel"],
  ["extinguishers", "D. Fire Extinguishers", "4.1", "Type / location / last serviced"],
  ["extinguishers", "D. Fire Extinguishers", "4.2", "Obstruction to fire extinguisher"],
  ["escape", "E. Means of Escape", "5.2", "Obstruction along escape staircases / door"],
  ["escape", "E. Means of Escape", "5.3", "Exit lights at staircases"],
  ["sprinkler", "F. Sprinkler System", "7.1.2", "Valve at open position strapped & locked"],
  ["sprinkler", "F. Sprinkler System", "7.1.8", "Signboard / label"],
  ["dry-riser", "G. Dry Riser", "8.4", "Dry riser breeching inlet paint yellow"],
  ["others", "H. Others", "9.3", "Fireman and fire engine access routes clear"],
  ["others", "H. Others", "9.5", "Illegal storage / combustible material"]
];

const findings = [
  ["fire-protection", "1.2", "Zone indicator lamp dim", "Zone indicator lamp was dim during testing.", "Replace the indicator lamp and function-test the panel.", "Medium", "Closed", 3],
  ["hosereel", "3.1", "Hose reel access obstructed", "Cartons restricted access to the hose reel cabinet.", "Remove cartons and mark the keep-clear area.", "High", "Closed", 4],
  ["extinguishers", "4.2", "Extinguisher partially obstructed", "A movable display partially blocked the extinguisher.", "Relocate the display and restore clear access.", "Medium", "Closed", 2],
  ["escape", "5.2", "Escape route obstruction", "Stored items reduced the clear escape route width.", "Remove stored items and brief the tenant.", "High", "Closed", 8],
  ["escape", "5.3", "Exit light not illuminated", "One exit light failed its functional test.", "Replace the battery pack and retest the fitting.", "High", "Resolved", 5],
  ["sprinkler", "7.1.2", "Sprinkler valve strap worn", "The valve securing strap showed signs of wear.", "Install a new labelled strap and lock.", "Medium", "Closed", 4],
  ["sprinkler", "7.1.8", "Control valve label faded", "The control valve identification label was faded.", "Install a new permanent identification label.", "Low", "Resolved", 6],
  ["dry-riser", "8.4", "Dry riser inlet paint faded", "Yellow identification paint was faded.", "Clean and repaint the breeching inlet.", "Medium", "In Progress", 0],
  ["others", "9.3", "Access route encroachment", "Delivery items encroached on the fire-engine access route.", "Remove the items and reinforce the no-storage rule.", "High", "Open", 0]
];

module.exports = { checklist, findings, buildInspectionDates };
