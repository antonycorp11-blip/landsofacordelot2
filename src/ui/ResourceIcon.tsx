import gold from '../assets/ui/gold.svg';
import influence from '../assets/ui/influence.svg';
import food from '../assets/ui/food.svg';
const icons={gold,influence,food};
/** Shared illustrated UI assets; labels belong to the surrounding control. */
export function ResourceIcon({name,size=28}:{name:keyof typeof icons;size?:number}) {
  return <img className="resource-icon" src={icons[name]} width={size} height={size} alt="" aria-hidden="true" draggable={false}/>;
}
