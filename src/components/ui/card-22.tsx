'use client';

import * as React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';

export interface PlaceCardProps {
  images: string[];
  tags: string[];
  rating: number;
  title: string;
  dateRange: string;
  hostType: string;
  isTopRated?: boolean;
  description: string;
  pricePerNight?: number;
  actionText?: string;
  className?: string;
}

export const PlaceCard = ({
  images,
  tags,
  rating,
  title,
  dateRange,
  hostType,
  isTopRated = false,
  description,
  pricePerNight,
  actionText = "Ver Programa",
  className,
}: PlaceCardProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const changeImage = (newDirection: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => {
      const nextIndex = prevIndex + newDirection;
      if (nextIndex < 0) return images.length - 1;
      if (nextIndex >= images.length) return 0;
      return nextIndex;
    });
  };

  const carouselVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
      variants={contentVariants}
      whileHover={{ 
        scale: 1.02, 
        boxShadow: '0px 14px 35px -5px rgba(0,0,0,0.12)',
        transition: { type: 'spring', stiffness: 300, damping: 20 }
      }}
      className={cn(
        'w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-md cursor-pointer flex flex-col',
        className
      )}
    >
      {/* Image Carousel Section */}
      <div className="relative group h-60 w-full overflow-hidden rounded-t-3xl bg-slate-100">
        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={title}
            custom={direction}
            variants={carouselVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute h-full w-full object-cover"
          />
        </AnimatePresence>
        
        {/* Carousel Navigation */}
        <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-black/40 hover:bg-black/60 text-white h-8 w-8"
            onClick={(e) => changeImage(-1, e)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-black/40 hover:bg-black/60 text-white h-8 w-8"
            onClick={(e) => changeImage(1, e)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Top Badges and Rating */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="bg-white/85 text-slate-900 font-semibold backdrop-blur-md shadow-sm border border-slate-200/60">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="secondary" className="flex items-center gap-1 bg-white/85 text-slate-900 font-bold backdrop-blur-md shadow-sm border border-slate-200/60">
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> {rating}
          </Badge>
        </div>

        {/* Pagination Dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={cn(
                'h-1.5 w-1.5 rounded-full transition-all',
                currentIndex === index ? 'w-4 bg-white' : 'bg-white/50'
              )}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Content Section */}
      <motion.div variants={contentVariants} className="p-5 flex flex-col flex-1 justify-between gap-3">
        <div className="space-y-2">
          <motion.div variants={itemVariants} className="flex justify-between items-start gap-2">
            <h3 className="text-lg font-bold text-slate-950 leading-snug">{title}</h3>
            {isTopRated && (
              <Badge variant="outline" className="border-blue-600 text-blue-700 bg-blue-50/60 text-[10px] uppercase font-bold shrink-0">
                Destacada
              </Badge>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <span>{dateRange}</span> &bull; <span className="text-slate-700 font-semibold">{hostType}</span>
          </motion.div>

          <motion.p variants={itemVariants} className="text-xs text-slate-600 leading-relaxed line-clamp-2">
            {description}
          </motion.p>
        </div>

        <motion.div variants={itemVariants} className="flex justify-between items-center pt-3 border-t border-slate-100 mt-auto">
          {pricePerNight ? (
            <p className="font-extrabold text-base text-slate-900">
              ${pricePerNight}{' '}
              <span className="text-xs font-normal text-slate-500">/ cuota</span>
            </p>
          ) : (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Inscripción abierta
            </span>
          )}
          <Button size="sm" className="group rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs px-4">
            {actionText}
            <ArrowRight className="h-3.5 w-3.5 ml-1.5 transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default PlaceCard;
