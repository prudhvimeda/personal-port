document.addEventListener('DOMContentLoaded', () => {
    // 1. Custom Cursor Logic
    const cursor = document.getElementById('custom-cursor');
    const trail = document.getElementById('cursor-trail');
    const interactiveElements = document.querySelectorAll('a, button, .list-tech li');

    let mouseX = 0;
    let mouseY = 0;
    let trailX = 0;
    let trailY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Update main cursor immediately
        cursor.style.left = `${mouseX}px`;
        cursor.style.top = `${mouseY}px`;
    });

    // Smooth trail animation
    function animateTrail() {
        // Linear interpolation for smooth trailing effect
        trailX += (mouseX - trailX) * 0.2;
        trailY += (mouseY - trailY) * 0.2;

        trail.style.left = `${trailX}px`;
        trail.style.top = `${trailY}px`;

        requestAnimationFrame(animateTrail);
    }
    animateTrail();

    // Hover effects for custom cursor
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.add('hover');
            trail.style.opacity = '0'; // Hide trail on hover
        });

        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover');
            trail.style.opacity = '1';
        });
    });

    // 1.5 Easter Egg Logic
    const easterEggTriggers = document.querySelectorAll('.easter-egg-trigger');
    const floatingImage = document.getElementById('floating-image');

    easterEggTriggers.forEach(trigger => {
        trigger.addEventListener('mouseenter', (e) => {
            const imgSrc = e.target.getAttribute('data-image');
            if (imgSrc) {
                floatingImage.style.backgroundImage = `url(${imgSrc})`;
                floatingImage.classList.remove('hidden');
                // Added slight delay to class toggle for transform animation
                setTimeout(() => {
                    floatingImage.classList.add('visible');
                }, 10);

                // Also expand the custom cursor
                cursor.classList.add('hover');
                trail.style.opacity = '0';
            }
        });

        trigger.addEventListener('mousemove', (e) => {
            // Position the floating image near the cursor, but offset slightly
            floatingImage.style.left = `${e.clientX + 120}px`;
            floatingImage.style.top = `${e.clientY - 50}px`;
        });

        trigger.addEventListener('mouseleave', () => {
            floatingImage.classList.remove('visible');
            setTimeout(() => {
                floatingImage.classList.add('hidden');
            }, 300); // Wait for transition to finish

            cursor.classList.remove('hover');
            trail.style.opacity = '1';
        });
    });

    // 2. Navigation Click and Scroll Sync
    const navLinks = document.querySelectorAll('.nav-links a');
    const contentArea = document.querySelector('.content');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);

            // Update active state manually before scroll completes
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Intersection Observer to reveal sections on scroll
    // and update navigation active state
    const sections = document.querySelectorAll('.dynamic-section');

    const observerOptions = {
        root: contentArea,
        rootMargin: '0px',
        threshold: 0.4
    };

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Reveal section animation
                entry.target.classList.remove('hidden');

                // Update nav active link based on scroll
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        sectionObserver.observe(section);
    });

    // Make the first section (home) visible initially
    setTimeout(() => {
        const homeSection = document.getElementById('home');
        if (homeSection) homeSection.classList.remove('hidden');
    }, 100);
});
