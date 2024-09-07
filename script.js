// Add smooth scrolling to all links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Add fade-in effect to sections on scroll
const sections = document.querySelectorAll('.full-height-section');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.intersectionRatio >= 0.5) {
            entry.target.classList.add('visible');
        } else {
            entry.target.classList.remove('visible');
        }
    });
}, { threshold: 0.5 }); // Changed from 0.1 to 0.5

sections.forEach(section => observer.observe(section));


// Adjust viewport height for mobile devices
function adjustViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('resize', adjustViewportHeight);
adjustViewportHeight();

document.getElementById('scroll-down-arrow').addEventListener('click', function() {
    const nextSection = document.querySelector('#description-section');
    nextSection.scrollIntoView({ behavior: 'smooth' });
});
