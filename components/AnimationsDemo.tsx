import React, { useState } from 'react';
import { Loader, ProgressBar, ProgressCircle, ImageEater, DeleteAnimation } from './animations';

export const AnimationsDemo: React.FC = () => {
  const [progress, setProgress] = useState(0.3);
  const [imageProgress, setImageProgress] = useState(0);
  
  // Load mask SVG content
  const maskPath = "M250.9,3.7c-.4,2.6,4.8-.6,5.1,1.9.9.8,3.3-1.1,3.4,1,5.4,0,13.2,3.2,19.6,1.9,14.9-5,43.3-3.4,60.5-3.9,16.1,3.2,34.2,4.8,48.5,13,8,.7,14.7,5,22.7,8.7,9.7,8.3,26.8,14.5,35.2,26.2,6,6.4,13.1,11.6,20.7,11.1,0,1.7,3.9.8,4.8,1,0,1.6,5.3.8,6.2,1,0,1.7,4.9.8,5.8,1,0,1.7,3.5.8,4.3,1-.4,1.4,1.4.7,1.9,1-.4,1.4,1.5.7,1.9,1-.4,1.4,1.5.7,1.9,1-.4,1.4,1.5.7,1.9,1,6.8,4.1,13.3,7.9,19.4,10.2,13.7,9.7,22.7,23.9,31.8,37.1.6,5.3,4.9,3.7,6.3,6.9,4.2,1.5,8.3,5.5,12.6,5.8,9.6,6.6,21.7,14.2,30.1,24.2,20.5,29,15.5,69.2-4.9,95.7-22,24.8-51.8,35.9-79.6,55-14.5,13.3-33.2,22.9-47.1,34.7-7.9,2.8-13.1,10.6-21.1,13.9-2.2-.2-3.7,2.7-6.1,3,0,2.7-4.3,2.5-4.9,5.1-26.4,8.8,1,48.3-40,63-12,1.2-18.5-6-25.4-14.4-.3-6-4.3,2-7.4,1.5-33.8,24-71.7,48.4-106.2,73.7-7.5,1.6-11.1,9.4-12.9,15.2,0,2.3-.1,8.9-1.9,10.1-2,13.9-20.1,25.7-31,18.9-2.1.3-5.5-1.3-6.5-3.3-4.3,1.1-9.8,5.1-12.5,8-18.5,5.1-14.4,23-11.9,38.7,8.5,25.4-21.6,58.4-43.6,34.2-4.4-8.4-5.4-17.7-7.8-25.8-12.7,11.1-25.6,17-38.2,26.9-35.9,27.6-67,10.4-82.2-29.8.1-11,.1-25.5,2.9-34.8-2.9-3.1-3-12.5-2.9-17.1,2.1-1.3,1.3-4.3,2.9-5.1-1-5,3.1-7.6,3.3-11.4,4-1.7,2.7-5.7,4.8-7.8.5-1-.8-2.6.8-2.7,1.7-7.5,2.9-16.2,6.4-22.3-.1-2.1.3-11.2,1.9-12-1.1-3.8.9-12.4.9-15.3,9.8-10.7,2.6-26.1,10.1-36.6.3-6.3,3.9-11.4,7.6-17.3,3.6-11.1-4.1-25.4,5.3-34.3.2-3.2,1.7-4.3,3.8-6.2.1-2.2,0-1.7,1.9-2.9,2.4-3.4,4.4-8.7,6.4-11.2.9-1-1.3-5.3,1-5.3.7-1-1-3.8,1-3.8.7-1-1-3.8,1-3.8.5-14.3,1.3-27.2,14.1-36.5,4.3-12.4,3.3-28.5,8-39.8-1-5.9,3-8.9,4-14.1,3-2,4.1-6.8,5.9-8.3,3.6-5.3,4.7-15.3,3.9-22.7,4.3-11.8,12.2-19.2,15.8-32.2,2.3-1,.6-7.9,3.4-8.7.9-.3-1.2-5.3,1-4.8-.5-3,1.8-6.2.9-9.5,2.3-.3-.4-5.1,2-5.4-1.1-7.4,9.5-13.7,8.2-18.5-10.6-16.2-21.9-35.2-17.3-54.5.5-27.8,17.8-57.6,45.8-66.9,12.2-4.6,34.2-5.7,46.1-1,16,1.1,30.1-5,45.8-3.9Z";

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-neutral-800 mb-2">Eating Animations</h1>
          <p className="text-neutral-600">Custom loaders, progress indicators, and delete animations</p>
        </div>

        {/* Loader Section */}
        <section className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-neutral-800 mb-6">Loaders</h2>
          <div className="flex flex-wrap gap-8 items-center justify-center">
            <div className="text-center">
              <Loader size={80} color="#FF4785" speed={150} />
              <p className="mt-2 text-sm text-neutral-600">Default Loader</p>
            </div>
            <div className="text-center">
              <Loader size={100} color="#3B82F6" speed={100} />
              <p className="mt-2 text-sm text-neutral-600">Fast Loader</p>
            </div>
            <div className="text-center">
              <Loader size={120} color="#10B981" speed={250} showCrumbs={false} />
              <p className="mt-2 text-sm text-neutral-600">No Crumbs</p>
            </div>
          </div>
        </section>

        {/* Progress Bar Section */}
        <section className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-neutral-800 mb-6">Progress Bars</h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-neutral-600">Animated Progress Bar</span>
                <span className="text-sm font-semibold">{(progress * 100).toFixed(0)}%</span>
              </div>
              <ProgressBar
                width={400}
                height={24}
                progress={progress}
                color="#FF4785"
                animated={true}
              />
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setProgress(Math.max(0, progress - 0.1))}
                  className="px-4 py-2 bg-neutral-200 rounded-lg hover:bg-neutral-300"
                >
                  -10%
                </button>
                <button
                  onClick={() => setProgress(Math.min(1, progress + 0.1))}
                  className="px-4 py-2 bg-neutral-200 rounded-lg hover:bg-neutral-300"
                >
                  +10%
                </button>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-neutral-600">Standard Progress Bar</span>
                <span className="text-sm font-semibold">65%</span>
              </div>
              <ProgressBar
                width="100%"
                height={20}
                progress={0.65}
                color="#3B82F6"
                animated={false}
              />
            </div>
          </div>
        </section>

        {/* Progress Circle Section */}
        <section className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-neutral-800 mb-6">Progress Circles</h2>
          <div className="flex flex-wrap gap-8 items-center justify-center">
            <div className="text-center">
              <ProgressCircle size={120} progress={0.45} color="#FF4785" animated={true} />
              <p className="mt-2 text-sm text-neutral-600">45% Animated</p>
            </div>
            <div className="text-center">
              <ProgressCircle size={100} progress={0.75} color="#10B981" animated={false} />
              <p className="mt-2 text-sm text-neutral-600">75% Standard</p>
            </div>
            <div className="text-center">
              <ProgressCircle size={140} progress={0.9} color="#F59E0B" animated={true} showCrumbs={false} />
              <p className="mt-2 text-sm text-neutral-600">90% No Crumbs</p>
            </div>
          </div>
        </section>

        {/* Image Eater Section */}
        <section className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-neutral-800 mb-6">Image Eater</h2>
          <div className="space-y-6">
            <div>
              <p className="text-sm text-neutral-600 mb-4">Auto-playing image eater with mask</p>
              <div className="flex justify-center">
                <ImageEater
                  src="/ref/image.png"
                  maskPath={maskPath}
                  viewBox="0 0 612.8 626.9"
                  width={300}
                  height={300}
                  autoPlay={true}
                  showCrumbs={true}
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-neutral-600 mb-4">Progress-controlled image eater</p>
              <div className="flex justify-center">
                <ImageEater
                  src="./ref/image.png"
                  maskPath={maskPath}
                  viewBox="0 0 612.8 626.9"
                  width={300}
                  height={300}
                  progress={imageProgress}
                  showCrumbs={true}
                />
              </div>
              <div className="mt-4 flex gap-2 justify-center">
                <button
                  onClick={() => setImageProgress(Math.max(0, imageProgress - 0.1))}
                  className="px-4 py-2 bg-neutral-200 rounded-lg hover:bg-neutral-300"
                >
                  -10%
                </button>
                <button
                  onClick={() => setImageProgress(Math.min(1, imageProgress + 0.1))}
                  className="px-4 py-2 bg-neutral-200 rounded-lg hover:bg-neutral-300"
                >
                  +10%
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Delete Animation Section */}
        <section className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-neutral-800 mb-6">Delete Animation</h2>
          <div className="flex flex-wrap gap-8 justify-center">
            <DeleteAnimation
              color="#EF4444"
              duration={800}
              onComplete={() => console.log('Deleted!')}
            >
              <div className="p-6 bg-blue-100 rounded-lg">
                <h3 className="font-bold text-blue-800">Card Item</h3>
                <p className="text-blue-600 text-sm">Click delete to animate removal</p>
              </div>
            </DeleteAnimation>
            <DeleteAnimation
              color="#F59E0B"
              duration={1200}
              showCrumbs={true}
            >
              <div className="p-6 bg-purple-100 rounded-lg">
                <h3 className="font-bold text-purple-800">Another Card</h3>
                <p className="text-purple-600 text-sm">Different color, slower animation</p>
              </div>
            </DeleteAnimation>
          </div>
        </section>
      </div>
    </div>
  );
};
