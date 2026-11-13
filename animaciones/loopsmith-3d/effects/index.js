/* Catálogo de experimentos, en el orden de la galería. Cada módulo exporta { id, n, group, name, lead, fields, mount(ctx) }. */
import grabThrow from "./01-grab-throw.js";
import zeroGravity from "./02-zero-gravity.js";
import magnetic3d from "./03-magnetic-3d.js";
import physicalCollapse from "./04-physical-collapse.js";
import elasticConnections from "./05-elastic-connections.js";
import objectInspection from "./06-object-inspection.js";
import scrollAssembly from "./07-scroll-assembly.js";
import cameraFlyThrough from "./08-camera-fly-through.js";
import explodedLogo from "./09-exploded-logo.js";
import floatingJourney from "./10-floating-letter-journey.js";
import cinematicReassembly from "./11-cinematic-reassembly.js";
import scrollOrbit from "./12-scroll-orbit.js";
import sectionTransition from "./13-spatial-section-transition.js";
import cinematicJourney from "./14-cinematic-journey.js";
import letterDominoes from "./15-letter-dominoes.js";
import mechanicalAssembly from "./16-mechanical-assembly.js";
import suspendedSculpture from "./17-suspended-sculpture.js";
import letterCarousel from "./18-letter-carousel.js";
import kineticMachine from "./19-kinetic-machine.js";
import spiralFormation from "./20-spiral-formation.js";
import chromeStudio from "./21-chrome-studio.js";
import materialTransformation from "./22-material-transformation.js";
import lightShadow from "./23-light-shadow-playground.js";
import ultimate from "./24-ultimate-brand-experience.js";

export const EFFECTS = [grabThrow, zeroGravity, magnetic3d, physicalCollapse, elasticConnections, objectInspection, scrollAssembly, cameraFlyThrough, explodedLogo, floatingJourney, cinematicReassembly, scrollOrbit, sectionTransition, cinematicJourney, letterDominoes, mechanicalAssembly, suspendedSculpture, letterCarousel, kineticMachine, spiralFormation, chromeStudio, materialTransformation, lightShadow, ultimate];
export const GROUPS = {
  A: ["Interacción física", "Mouse · touch · física"],
  B: ["Scroll espacial", "El scroll mueve objetos y cámara"],
  C: ["Movimiento y coreografía", "Secuencias 3D"],
  D: ["Efectos visuales y materiales", "Luz · material · síntesis"],
};
