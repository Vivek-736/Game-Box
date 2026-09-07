import Image from "next/image"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function Page() {
  return (
    <Empty className="flex min-h-[calc(100svh-3.5rem)]">
      <EmptyHeader>
        <EmptyMedia>
          <Image src="/logo.svg" alt="GameBox" width={48} height={48} />
        </EmptyMedia>
        <EmptyTitle className="text-2xl">
          What should we build today?
        </EmptyTitle>
        <EmptyDescription className="text-muted-foreground">
          Build your own racers, shooters, puzzles and whole worlds using your
          own words. If you can describe it, you can play it.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}