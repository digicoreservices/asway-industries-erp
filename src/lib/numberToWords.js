export function numberToWords(n) {
  if (n < 0) return false;
  
  // Format to 2 decimal places
  const num = parseFloat(n).toFixed(2);
  const [whole, fraction] = num.split('.');
  
  // Adjusted 'Zero' to empty string to prevent "Twenty Zero" issues during recursion
  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const double = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function translate(n) {
    let word = "";
    if (n === 0) return ""; // Explicitly return empty string for 0 in recursion

    if (n < 10) {
      word = single[n] + ' ';
    } else if (n < 20) {
      word = double[n - 10] + ' ';
    } else if (n < 100) {
      word = tens[Math.floor(n / 10)] + ' ' + translate(n % 10);
    } else if (n < 1000) {
      word = single[Math.floor(n / 100)] + ' Hundred ' + translate(n % 100);
    } else if (n < 100000) {
      word = translate(Math.floor(n / 1000)) + ' Thousand ' + translate(n % 1000);
    } else if (n < 10000000) {
      word = translate(Math.floor(n / 100000)) + ' Lakh ' + translate(n % 100000);
    } else {
      word = translate(Math.floor(n / 10000000)) + ' Crore ' + translate(n % 10000000);
    }
    return word;
  }
  
  let result = "";
  const wholeInt = parseInt(whole);

  // Handle the explicit case of 0 separately since recursion returns empty
  if (wholeInt === 0) {
    result = "Zero";
  } else {
    result = translate(wholeInt).trim();
  }
  
  if (parseInt(fraction) > 0) {
    result += ` and ${translate(parseInt(fraction)).trim()} Paise`;
  }
  
  return result + ' Only';
}