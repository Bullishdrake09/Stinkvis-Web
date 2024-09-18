document.addEventListener("DOMContentLoaded", () => {
    console.log("Animations and other interactions can go here.");
});
document.addEventListener('mousemove', (e) => {
        const card = document.querySelector('.container');
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;

        // Calculate rotation angles based on mouse position
        const rotateX = ((clientY / innerHeight) - 0.5) * 30; // Tilt up and down
        const rotateY = ((clientX / innerWidth) - 0.5) * -30; // Tilt left and right

        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
});
