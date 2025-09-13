// JS básico do site DG (sem backend)
(function () {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Menu mobile Larii
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('[data-nav]');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.getAttribute('data-open') === 'true';
      nav.setAttribute('data-open', String(!open));
      toggle.setAttribute('aria-expanded', String(!open));
    });
  }

  // Funcionalidade de login removida - agora está no index.html

})();

// Carousel autoplay
document.addEventListener("DOMContentLoaded", () => {
  const images = document.querySelectorAll(".carousel-images img");
  let currentIndex = 0;

  if (images.length > 0) {
    // mostra a primeira imagem
    showImage(currentIndex);

    function showImage(index) {
      images.forEach(img => img.classList.remove("active"));
      images[index].classList.add("active");
    }

    function nextImage() {
      currentIndex = (currentIndex + 1) % images.length;
      showImage(currentIndex);
    }

    // troca automaticamente a cada 3 segundos
    setInterval(nextImage, 3000);
  }
});
