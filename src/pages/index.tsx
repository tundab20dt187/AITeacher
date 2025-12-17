import dynamic from 'next/dynamic';

import PresentationViewer from '../components/PresentationViewer'; 

const Scene = dynamic(() => import('../components/Scene'), {
  ssr: false,
});

export default function Home() {
  return <PresentationViewer />;
}