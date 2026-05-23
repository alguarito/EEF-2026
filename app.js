document.addEventListener('DOMContentLoaded', () => {
    const mobileMenu = document.getElementById('mobile-menu');
    const navLinks = document.getElementById('nav-list');
    const header = document.querySelector('header');

    // Toggle Mobile Menu
    mobileMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenu.querySelector('i').classList.toggle('fa-bars');
        mobileMenu.querySelector('i').classList.toggle('fa-times');
    });

    // Close menu when clicking a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            if (!link.parentElement.classList.contains('dropdown')) {
                navLinks.classList.remove('active');
                mobileMenu.querySelector('i').classList.add('fa-bars');
                mobileMenu.querySelector('i').classList.remove('fa-times');
            }
        });
    });

    // Scrolled Header Effect - TOGGLE CLASS FOR PREMIUM CSS TRANSITION
    window.addEventListener('scroll', () => {
        if (window.scrollY > 30) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Mobile Dropdown Toggle
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('click', (e) => {
            if (window.innerWidth <= 992) {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            }
        });
    });

    // Back to top button functionality
    const scrollTopBtn = document.getElementById('scroll-top-btn');
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});
