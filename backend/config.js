// Reservation fee charged through the website to secure a booking slot.
// NOTE: This is a booking/processing fee collected up front — NOT the full official
// exam fee (which varies daily with the USD/NPR rate and is confirmed with the
// customer directly, same as the rest of the industry). Edit these freely.
const EXAM_RESERVATION_FEE = {
  'IELTS': 36000,
  'UKVI IELTS': 36400,
  'PTE Academic': 33000,
  'TOEFL iBT': 35000,
  'Duolingo English Test': 9800,
  'SAT': 19000,
  'GRE': 34000,
  'GMAT': 42000,
  'OET': 0, 
  'NCLEX': 0,
  'Prometric': 0,
};

const TIME_SLOTS = ['Morning (8AM–12PM)', 'Afternoon (12PM–4PM)', 'Evening (4PM–8PM)'];

module.exports = { EXAM_RESERVATION_FEE, TIME_SLOTS };
