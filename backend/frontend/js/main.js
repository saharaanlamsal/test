// BookMyTest — shared site behaviour

document.addEventListener('DOMContentLoaded', () => {

  /* Mobile nav toggle */
  const navToggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const navClose = document.querySelector('.nav-close');

  function openNav() {
    mobileNav?.classList.add('open');
    navClose?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeNav() {
    mobileNav?.classList.remove('open');
    navClose?.classList.remove('open');
    document.body.style.overflow = '';
  }
  navToggle?.addEventListener('click', openNav);
  navClose?.addEventListener('click', closeNav);
  mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));

  /* FAQ accordion */
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    q?.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  /* Exam category tab filter (exams page) */
  const tabBtns = document.querySelectorAll('.tab-btn');
  const catBlocks = document.querySelectorAll('.exam-category-block');
  if (tabBtns.length && catBlocks.length) {
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.target;
        catBlocks.forEach(block => {
          if (target === 'all' || block.dataset.category === target) {
            block.style.display = '';
          } else {
            block.style.display = 'none';
          }
        });
      });
    });
  }

  /* Contact form -> WhatsApp prefill + FormSubmit */
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', () => {
      const name = form.querySelector('#name')?.value || '';
      const exam = form.querySelector('#exam')?.value || '';
      const phone = form.querySelector('#phone')?.value || '';
      const message = form.querySelector('#message')?.value || '';

      const waText = `Hi BookMyTest! My name is ${name}. I'm interested in booking/getting a Test for: ${exam}. Phone: ${phone}. ${message}`;
      const waUrl = `https://wa.me/9779857035643?text=${encodeURIComponent(waText)}`;

      // Open WhatsApp in a new tab; the form itself still submits to FormSubmit
      window.open(waUrl, '_blank');
    });
  }

  /* Quick-inquiry buttons on exam cards -> prefill WhatsApp with exam name */
  document.querySelectorAll('[data-wa-exam]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const examName = el.getAttribute('data-wa-exam');
      const text = `Hi BookMyTest! I'd like to know more about booking/test registration for ${examName}. Please share the current price and process.`;
      window.open(`https://wa.me/9779857035643?text=${encodeURIComponent(text)}`, '_blank');
    });
  });

  /* Reveal-on-scroll */
  const revealEls = document.querySelectorAll('.exam-card, .why-card, .testi-card, .how-step');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    io.observe(el);
  });
});
