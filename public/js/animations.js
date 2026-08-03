gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({

    duration:1.3,

    smoothWheel:true,

    smoothTouch:false

});

function raf(time){

    lenis.raf(time);

    requestAnimationFrame(raf);

}

requestAnimationFrame(raf);

gsap.utils.toArray("section").forEach(section=>{

    gsap.from(section,{

        opacity:0,

        y:120,

        duration:1.2,

        ease:"power3.out",

        scrollTrigger:{

            trigger:section,

            start:"top 80%"

        }

    });

});

gsap.from(".gallery-item",{

    opacity:0,

    y:80,

    stagger:.12,

    duration:1,

    ease:"power3.out",

    scrollTrigger:{

        trigger:"#portfolio",

        start:"top 70%"

    }

});

gsap.from(".about-media img",{

    scale:1.25,

    opacity:0,

    duration:1.5,

    ease:"power4.out",

    scrollTrigger:{

        trigger:".about-media",

        start:"top 75%"

    }

});

gsap.from(".about-copy p",{

    y:40,

    opacity:0,

    stagger:.25,

    duration:.9,

    scrollTrigger:{

        trigger:".about-copy",

        start:"top 80%"

    }

});

ScrollTrigger.create({

    start:"top -100",

    end:99999,

    toggleClass:{

        className:"scrolled",

        targets:".site-header"

    }

});

gsap.to(".slide.active",{

    scale:1.12,

    duration:7,

    ease:"none"

});

document.addEventListener("mousemove",(e)=>{

const x=(e.clientX/window.innerWidth-.5)*40;

const y=(e.clientY/window.innerHeight-.5)*40;

gsap.to(".hero",{

x:x,

y:y,

duration:1.2,

ease:"power2.out"

});

});

const cursor=document.getElementById("cursor");

window.addEventListener("mousemove",(e)=>{

gsap.to(cursor,{

left:e.clientX,

top:e.clientY,

duration:.15

});

});

document.querySelectorAll("button,a").forEach(el=>{

el.addEventListener("mousemove",e=>{

const rect=el.getBoundingClientRect();

const x=e.clientX-rect.left-rect.width/2;

const y=e.clientY-rect.top-rect.height/2;

gsap.to(el,{

x:x*.25,

y:y*.25,

duration:.3

});

});

el.addEventListener("mouseleave",()=>{

gsap.to(el,{

x:0,

y:0,

duration:.4

});

});

});

gsap.from(".team-card",{

opacity:0,

rotationY:45,

y:100,

stagger:.12,

duration:1,

scrollTrigger:{

trigger:".team-section",

start:"top 70%"

}

});

const text=new SplitType("h1");

gsap.from(text.chars,{

opacity:0,

y:80,

rotationX:-90,

stagger:.04,

duration:1,

ease:"back.out"

});