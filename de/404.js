function dist(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 1; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const indicator = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + indicator // substitution
      );
    }
  }
  return 1 - matrix[b.length][a.length]/ Math.max(a.length, a.length);
}
let urls = [
  "https://www.neverstudio.de/",
  "https://www.neverstudio.de/404.html",
  "https://www.neverstudio.de/contact/",
  "https://www.neverstudio.de/projects/neverword/wordle-project.html",
  "https://www.neverstudio.de/projects/neverengine/engine-project.html",
  "https://www.neverstudio.de/projects/neverengine/neverisometric.html",
  "https://www.neverstudio.de/tutorials/webagent/webuse-post.html",
  "https://www.neverstudio.de/de/",
  "https://www.neverstudio.de/de/404.html",
  "https://www.neverstudio.de/de/contact/",
  "https://www.neverstudio.de/de/projects/neverword/wordle-project.html",
  "https://www.neverstudio.de/de/projects/neverword/wordguesser.html",
  "https://www.neverstudio.de/de/projects/neverword/findhashurl.html",
  "https://www.neverstudio.de/de/projects/neverengine/engine-project.html",
]

let substitutes = {"https://www.neverstudio.de/neverword.html":"https://www.neverstudio.de/de/wordguesser.html"}
let currentUrl = document.URL;
urls.sort(function(a, b){return dist(b,currentUrl)-dist(a,currentUrl);})
let suggest = urls[0];
if(Object.keys(substitutes).includes(suggest)){
	suggest = substitutes[suggest]
}
let helper = document.getElementById("help");
helper.innerHTML = 'Meinten Sie <a title="correction suggestion" href="'+suggest+'">'+suggest+'</a>?<br><br>'+helper.innerHTML