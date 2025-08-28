import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

function NotFound() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col items-center justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-4xl font-bold">404</h1>
          <h2 className="text-2xl font-semibold tracking-tight">
            Page Not Found
          </h2>
          <p className="text-sm text-muted-foreground">
            The page you are looking for does not exist.
          </p>
        </div>

        <Button asChild>
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default NotFound; 