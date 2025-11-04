'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase';
import { BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import placeholderImageData from '@/lib/placeholder-images.json';
import Image from 'next/image';
import Link from 'next/link';


export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        router.push('/dashboard');
      }
    };
    checkUser();
  }, [router]);

  const heroImage = placeholderImageData.placeholderImages.find(
    (img) => img.id === 'hero-background'
  );

  return (
    <main className="relative min-h-screen w-full">
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover"
          priority
          data-ai-hint={heroImage.imageHint}
        />
      )}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-2xl">
          <CardHeader>
            <div className="mx-auto flex items-center justify-center gap-3">
              <BrainCircuit className="h-10 w-10 text-primary" />
              <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground">
                BlockWise
              </h1>
            </div>
            <CardDescription className="pt-2 text-lg">
              AI-Powered Study Management for JEE Students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-8 text-muted-foreground">
              Structure your learning, track your progress, and master every
              topic with intelligent, adaptive study blocks.
            </p>
            <Button asChild size="lg" className="w-full max-w-xs mx-auto">
              <Link href="/auth">Get Started</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
