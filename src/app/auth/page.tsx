
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrainCircuit } from 'lucide-react';
import { signIn, signUp } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const authSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' }),
});

type AuthFormValues = z.infer<typeof authSchema>;

export default function AuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('login');
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: AuthFormValues) => {
    setError(null);
    if (activeTab === 'login') {
      const { data, error } = await signIn(values.email, values.password);
      if (error) {
        setError(error.message);
      } else {
        toast({
          title: 'Login Successful',
          description: "Welcome back!",
        });
        router.push('/dashboard');
      }
    } else {
      const { data, error } = await signUp(values.email, values.password);
      if (error) {
        setError(error.message);
      } else {
        if (data.user && data.user.identities && data.user.identities.length === 0) {
            setError("User already exists. Please try logging in.");
        } else {
            setShowConfirmationMessage(true);
        }
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
        <div className="mx-auto flex items-center justify-center gap-3">
              <BrainCircuit className="h-10 w-10 text-primary" />
              <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground">
                BlockWise
              </h1>
            </div>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showConfirmationMessage ? (
             <Alert>
             <AlertTitle>Check your email!</AlertTitle>
             <AlertDescription>
               We've sent a confirmation link to your email address. Please
               click the link to complete your registration.
             </AlertDescription>
           </Alert>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <AuthForm form={form} onSubmit={onSubmit} buttonText="Login" />
            </TabsContent>
            <TabsContent value="signup">
              <AuthForm form={form} onSubmit={onSubmit} buttonText="Sign Up" />
            </TabsContent>
          </Tabs>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

function AuthForm({
  form,
  onSubmit,
  buttonText,
}: {
  form: any;
  onSubmit: (values: AuthFormValues) => void;
  buttonText: string;
}) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Processing...' : buttonText}
        </Button>
      </form>
    </Form>
  );
}
