import Hero from "../components/home/Hero";
import Stats from "../components/home/Stats";
import FeaturedScripts from "../components/home/FeaturedScripts";
import Categories from "../components/home/Categories";
import HowItWorks from "../components/home/HowItWorks";
import About from "../components/home/About";
import CallToAction from "../components/home/CallToAction";

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <FeaturedScripts />
      <Categories />
      <HowItWorks />
      <About />
      <CallToAction />
    </>
  );
}